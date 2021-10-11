import { Injectable, Output } from '@angular/core';
import { forkJoin, Observable, ReplaySubject, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ApiExploreStatistics, ModifierApiObjet } from '../models/api-request-models/survival-analyis/api-explore-statistics';
import { ApiExploreStatisticResult, ApiExploreStatisticsResponse, ApiInterval } from '../models/api-response-models/explore-statistics/explore-statistics-response';
import { Constraint } from '../models/constraint-models/constraint';
import { TreeNode } from '../models/tree-models/tree-node';
import { ErrorHelper } from '../utilities/error-helper';
import { ApiEndpointService } from './api-endpoint.service';
import { MedcoNetworkService } from './api/medco-network.service';
import { ConstraintMappingService } from './constraint-mapping.service';
import { ConstraintReverseMappingService } from './constraint-reverse-mapping.service';
import { ConstraintService } from './constraint.service';
import { CryptoService } from './crypto.service';
import { NavbarService } from './navbar.service';
import { QueryService } from './query.service';

// this class represents contains the following info: how many observations there are in a interval of a histogram for a concept
export class Interval {
    count: number
    higherBound: string
    lowerBound: string

    constructor(lowerBound, higherBound, decryptedCount) {
        this.higherBound = higherBound
        this.lowerBound = lowerBound
        this.count = decryptedCount
        console.log('Clear count for [', this.lowerBound, ', ', this.higherBound, '] is ', this.count)
    }
}

// This class contains all information necessary to build a histogram chart with chart.js
export class ChartInformation {
    intervals: Interval[]
    readonly unit: string
    readonly readable: Observable<any>

    constructor(apiResponse: ApiExploreStatisticResult, cryptoService: CryptoService,
        public readonly treeNodeName: string, public readonly cohortName: string) {
        this.unit = apiResponse.unit

        const encCounts: string[] = apiResponse.intervals.map((i: ApiInterval) => i.encCount)
        const decryptedCounts = cryptoService.decryptIntegersWithEphemeralKey(encCounts)
        this.readable = decryptedCounts
        decryptedCounts.subscribe(counts => {
            this.intervals = counts.map((count, intervalIndex) => {
                const apiInterval = apiResponse.intervals[intervalIndex]
                return new Interval(apiInterval.lowerBound, apiInterval.higherBound, count)
            })
        })

    }

}

/*
* ExploreStatisticsService that communicates with the following two components: explore-statistics-settings, explore-statistics-results.
* From the settings given by the explore-statistics-settings form, this class is able to execute a
* query which will fetch the aggregated number of observations
* per interval for a specific concept. It communicates that info to explore-statistics-results which will display that histogram as a chart
*/
@Injectable({
    providedIn: 'root' // singleton service
})
export class ExploreStatisticsService {

    // 1 minute timeout
    private static TIMEOUT_MS = 1000 * 60 * 1;

    // Sends the result of the latest query when is is available
    @Output() chartsDataSubject: Subject<ChartInformation[]> = new ReplaySubject(1)

    // Emits whenever the explore statitistics query has been launched.
    @Output() displayLoadingIcon: Subject<boolean> = new ReplaySubject(1)

    private static getNewQueryID(): string {
        let d = new Date()
        return (`Explore_Statistics${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}${d.getUTCHours()}` +
            `${d.getUTCMinutes()}${d.getUTCSeconds()}${d.getUTCMilliseconds()}`)
    }

    constructor(
        private apiEndpointService: ApiEndpointService,
        private cryptoService: CryptoService,
        private medcoNetworkService: MedcoNetworkService,
        private constraintService: ConstraintService,

        private queryService: QueryService,
        private constraintMappingService: ConstraintMappingService,
        private reverseConstraintMappingService: ConstraintReverseMappingService,
        private navbarService: NavbarService
    ) {

    }


    private refreshConstraint(constraint: Constraint): Observable<Constraint> {
        return this.reverseConstraintMappingService.mapPanels(this.constraintMappingService.mapConstraint(constraint))
    }


    /*
     * This function is called when the user wants to execute an explore statistics from the explore tab.
     * This function sends an explore statistics query to all running back-end nodes.
     *  When the answer is received it is processed and transformed
     * into a list of chart informations. Each chart information is used to build a new chart in the front end.
     */
    executeQueryFromExplore(bucketSize: number, minObservation: number) {
        if (bucketSize === undefined || bucketSize <= 0) {
            ErrorHelper.handleError('Please specify a bucket size that will define the histograms\' intervals', Error('Bucket size not specified'))
            return
        }

        if (minObservation === undefined) {
            ErrorHelper.handleError('Please specify the minimal observation that exists', Error('minimal observation input undefined'))
        }

        const constraint = this.constraintService.rootInclusionConstraint
        const upToDateConstraintObs = this.refreshConstraint(constraint)

        upToDateConstraintObs.subscribe(upToDateConstraint => {
            const uniqueAnalytes = new Set(upToDateConstraint.getAnalytes())
            console.log('Analytes ', uniqueAnalytes)


            const cohortConstraint: Constraint = this.prepareCohort(upToDateConstraint);

            const analytes = Array.from(uniqueAnalytes)

            // the analytes split into two groups: modifiers and concepts
            const { conceptsPaths, modifiers }: { conceptsPaths: string[]; modifiers: ModifierApiObjet[]; } =
                this.extractConceptsAndModifiers(analytes);

            const apiRequest: ApiExploreStatistics = {
                ID: ExploreStatisticsService.getNewQueryID(),
                concepts: conceptsPaths,
                modifiers: modifiers,
                userPublicKey: this.cryptoService.ephemeralPublicKey,
                bucketSize,
                minObservation,
                cohortDefinition: {
                    queryTiming: this.queryService.lastTiming,
                    panels: this.constraintMappingService.mapConstraint(cohortConstraint)
                }
            }

            this.displayLoadingIcon.next(true)

            const observableRequest = this.sendRequest(apiRequest)

            this.navbarService.navigateToExploreTab()
            console.log('Api request ', apiRequest)

            observableRequest.subscribe((answers: ApiExploreStatisticsResponse[]) => {
                if (answers === undefined || answers.length === 0) {
                    ErrorHelper.handleNewError('Error with the servers. Empty result in explore-statistics.')
                    return
                }
                // All servers are supposed to send the same information so we pick the element with index zero
                const serverResponse: ApiExploreStatisticsResponse = answers[0]


                if (serverResponse.results === undefined) {
                    this.displayLoadingIcon.next(false)
                    ErrorHelper.handleNewError('Please verify you selected an analyte.')
                    return
                }

                const chartsInformations = serverResponse.results.map((result: ApiExploreStatisticResult) =>
                    new ChartInformation(result, this.cryptoService, result.analyteName, cohortConstraint.textRepresentation)
                )



                forkJoin(chartsInformations.map(ci => ci.readable)).subscribe(_ => {
                    // waiting for the intervals to be decrypted by the crypto service to emit the chart information to external listeners.
                    this.chartsDataSubject.next(chartsInformations)
                    this.displayLoadingIcon.next(false)
                })

            }, err => {
                this.displayLoadingIcon.next(false)
            })
        })

    }


    private sendRequest(apiRequest: ApiExploreStatistics): Observable<ApiExploreStatisticsResponse[]> {
        return forkJoin(this.medcoNetworkService.nodes
            .map(
                node => this.apiEndpointService.postCall(
                    'node/explore-statistics/query',
                    apiRequest,
                    node.url
                )
            ))
            .pipe(timeout(ExploreStatisticsService.TIMEOUT_MS));
    }

    private extractConceptsAndModifiers(analytes: TreeNode[]) {
        const conceptsPaths = analytes
            .filter(node => !node.isModifier)
            .map(node => node.path);

        const modifiers: Array<ModifierApiObjet> = analytes.filter(node => node.isModifier).map(node => {
            return {
                ParentConceptPath: node.appliedPath,
                ModifierKey: node.path,
                AppliedPath: node.appliedConcept.path
            };
        });
        return { conceptsPaths, modifiers };
    }

    private prepareCohort(upToDateConstraint: Constraint) {
        const filteredInclusionConstraint = upToDateConstraint.constraintWithoutAnalytes();
        const cohortConstraint = this.constraintService.generateConstraintHelper(filteredInclusionConstraint,
            this.constraintService.rootExclusionConstraint);

        console.log('Cohort constraint ', cohortConstraint);

        if (cohortConstraint === undefined) {
            throw ErrorHelper.handleNewError('Undefined population. Please select criterias which are not analytes');
        }

        const errorMsg = cohortConstraint.inputValueValidity();
        if (errorMsg !== '') {
            throw ErrorHelper.handleNewError(errorMsg);
        }
        return cohortConstraint;
    }


}
