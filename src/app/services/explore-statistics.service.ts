import { Injectable, Output } from '@angular/core';
import { forkJoin, interval, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { ApiI2b2Panel } from '../models/api-request-models/medco-node/api-i2b2-panel';
import { ApiExploreStatistics, ModifierApiObjet } from '../models/api-request-models/survival-analyis/api-explore-statistics';
import { ApiExploreStatisticResult, ApiExploreStatisticsResponse, ApiInterval } from '../models/api-response-models/explore-statistics/explore-statistics-response';
import { CombinationConstraint } from '../models/constraint-models/combination-constraint';
import { Constraint } from '../models/constraint-models/constraint';
import { TreeNode } from '../models/tree-models/tree-node';
import { ErrorHelper } from '../utilities/error-helper';
import { PDF } from '../utilities/files/pdf';
import { ApiEndpointService } from './api-endpoint.service';
import { MedcoNetworkService } from './api/medco-network.service';
import { ConstraintMappingService } from './constraint-mapping.service';
import { ConstraintReverseMappingService } from './constraint-reverse-mapping.service';
import { ConstraintService } from './constraint.service';
import { CryptoService } from './crypto.service';
import { NavbarService } from './navbar.service';
import { QueryService } from './query.service';

export class ConfidenceInterval {
    constructor(private _lowerBound: number, private _middle: number, private _higherBound: number) {
    }

    get lowerBound() {
        return this._lowerBound
    }

    get middle() {
        return this._middle
    }

    get higherBound() {
        return this._higherBound
    }
}

// this class represents contains the following info: how many observations there are in a interval of a histogram for a concept
export class Interval {
    count: number
    higherBound: string
    lowerBound: string

    constructor(lowerBound: string, higherBound: string, decryptedCount: number) {
        this.higherBound = higherBound
        this.lowerBound = lowerBound
        this.count = decryptedCount
    }
}



// This class contains all information necessary to build a histogram chart with chart.js
export class ChartInformation {
    readonly intervals: Interval[]
    readonly unit: string
    readonly CI1: ConfidenceInterval
    readonly CI2: ConfidenceInterval
    readonly readable: Observable<any>

    constructor(intervals: Interval[], unit: string,
        public readonly treeNodeName: string, public readonly cohortName: string) {

        this.intervals = intervals
        this.unit = unit

        this.CI1 = ChartInformation.computeCI1(intervals)
        this.CI2 = ChartInformation.computeCI2(intervals)
    }

    private static computeCI1(intervals: Interval[]): ConfidenceInterval {
        return new ConfidenceInterval(1,2,3)
    }


    private static computeCI2(intervals: Interval[]): ConfidenceInterval {
        return new ConfidenceInterval(7,8,9)
    }

    numberOfObservations(): number {
        return this.intervals.map(i => i.count).reduce((x1, x2) => x1 + x2)
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


    private isEmptyConstraint: boolean = true

    // 1 minute timeout
    private static TIMEOUT_MS = 1000 * 60 * 1;

    // Sends the result of the latest query when is is available
    @Output() chartsDataSubject: Subject<ChartInformation[]> = new ReplaySubject(1)

    // Emits whenever the explore statitistics query has been launched.
    @Output() displayLoadingIcon: Subject<boolean> = new ReplaySubject(1)

    // Emits whenever an export of the statistical results as a pdf document needs to be generated
    exportAsPDF: Subject<any> = new Subject();

    // This observable emits the latest query's cohort inclusion criteria
    inclusionConstraint: Subject<Constraint> = new ReplaySubject(1)
    // This observable emits the latest query's cohort exclusion criteria
    exclusionConstraint: Subject<Constraint> = new ReplaySubject(1)

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


    // The panels returned by the constraint service have a tendency to be out of date. Use this method to refresh them.
    private refreshConstraint(constraint: Constraint): Observable<Constraint> {
        const i2b2Panels: ApiI2b2Panel[] = this.constraintMappingService.mapConstraint(constraint)

        if (i2b2Panels.length == 0) {
            /* Return an empty constraint if the passed parameter is empty.
            * This can happen if the exclusion criteria is empty for example.  */
            return of(new CombinationConstraint())
        }

        return this.reverseConstraintMappingService.mapPanels(i2b2Panels)
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

        const updatedInclusionObs = this.refreshConstraint(this.constraintService.rootInclusionConstraint)
        const updatedExclusionObs = this.refreshConstraint(this.constraintService.rootExclusionConstraint)


        forkJoin([updatedInclusionObs, updatedExclusionObs]).subscribe(updatedConstraints => {
            this.processQuery(updatedConstraints, bucketSize, minObservation);
        })


    }


    private processQuery(updatedConstraints: [Constraint, Constraint], bucketSize: number, minObservation: number) {
        const [upToDateInclusionConstraint, upToDateExclusionConstraint] = updatedConstraints

        console.log("Updated inclusion and exclusion constraints", upToDateInclusionConstraint, upToDateExclusionConstraint);

        const uniqueAnalytes = new Set(upToDateInclusionConstraint.getAnalytes());
        console.log('Analytes ', uniqueAnalytes);


        const cohortConstraint = this.prepareCohort(upToDateInclusionConstraint, upToDateExclusionConstraint);

        const analytes = Array.from(uniqueAnalytes);

        if (analytes.length == 0) {
            ErrorHelper.handleNewError('No analytes have been specified. An analyte is a numerical medical concept for which the constraint is set with value "any"');
        }

        // the analytes split into two groups: modifiers and concepts
        const { conceptsPaths, modifiers }: { conceptsPaths: string[]; modifiers: ModifierApiObjet[]; } = this.extractConceptsAndModifiers(analytes);


        const apiRequest: ApiExploreStatistics = {
            ID: ExploreStatisticsService.getNewQueryID(),
            concepts: conceptsPaths,
            modifiers: modifiers,
            userPublicKey: this.cryptoService.ephemeralPublicKey,
            bucketSize,
            minObservation,
            cohortDefinition: {
                queryTiming: this.queryService.lastTiming,
                panels: this.constraintMappingService.mapConstraint(cohortConstraint),
                isPanelEmpty: this.isEmptyConstraint
            }
        };

        this.displayLoadingIcon.next(true);

        const observableRequest = this.sendRequest(apiRequest);

        this.navbarService.navigateToExploreTab();
        console.log('Api request ', apiRequest);

        observableRequest.subscribe((answers: ApiExploreStatisticsResponse[]) => {
            if (answers === undefined || answers.length === 0) {
                ErrorHelper.handleNewError('Error with the servers. Empty result in explore-statistics.');
                return;
            }
            // All servers are supposed to send the same information so we pick the element with index zero
            const serverResponse: ApiExploreStatisticsResponse = answers[0];


            if (serverResponse.results === undefined || serverResponse.results === null) {
                this.displayLoadingIcon.next(false);
                ErrorHelper.handleNewError('Empty server response. Please verify you selected an analyte.');
                return;
            }

            const chartsInformationsObservables: Observable<ChartInformation>[] = serverResponse.results.map((result: ApiExploreStatisticResult) => {

                const encCounts: string[] = result.intervals.map((i: ApiInterval) => i.encCount)

                const decryptedCounts = this.cryptoService.decryptIntegersWithEphemeralKey(encCounts)

                return decryptedCounts.pipe(
                    map(counts => {
                        const intervals = counts.map((count, intervalIndex) => {
                            const apiInterval = result.intervals[intervalIndex]
                            return new Interval(apiInterval.lowerBound, apiInterval.higherBound, count)
                        })

                        return new ChartInformation(intervals, result.unit, result.analyteName, cohortConstraint.textRepresentation)
                    }),
                )
            });



            forkJoin(chartsInformationsObservables).subscribe((chartsInformations: ChartInformation[]) => {
                // waiting for the intervals to be decrypted by the crypto service to emit the chart information to external listeners.
                this.chartsDataSubject.next(chartsInformations);
                this.displayLoadingIcon.next(false);
            });

        }, err => {
            ErrorHelper.handleNewError('An error occured during the request execution.')
            this.displayLoadingIcon.next(false);
        });
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

    private isEmptyCombinationConstraint(constraint: Constraint): boolean {
        if (constraint instanceof CombinationConstraint) {
            const children = (constraint as CombinationConstraint).children
            return children === undefined || children.length === 0
        }
        return false
    }

    private constraintIsEmpty(constraint: Constraint): boolean {

        return constraint === undefined || this.isEmptyCombinationConstraint(constraint)
    }

    private prepareCohort(upToDateInclusionConstraint: Constraint, upToDateExclusionConstraint: Constraint): Constraint {
        let filteredInclusionConstraint = upToDateInclusionConstraint.constraintWithoutAnalytes();
        let cohortConstraint = this.constraintService.generateConstraintHelper(filteredInclusionConstraint, upToDateExclusionConstraint);


        if (cohortConstraint === undefined) {
            cohortConstraint = new CombinationConstraint()
        }

        const isInclusionEmpty = this.constraintIsEmpty(filteredInclusionConstraint)
        if (isInclusionEmpty) { // empty constraint
            filteredInclusionConstraint = new CombinationConstraint()
        }

        const isExclusionEmpty = this.constraintIsEmpty(upToDateExclusionConstraint)
        if (isExclusionEmpty) { // empty constraint
            upToDateExclusionConstraint = new CombinationConstraint()
        }

        this.inclusionConstraint.next(filteredInclusionConstraint)
        this.exclusionConstraint.next(upToDateExclusionConstraint)


        const errorMsg = cohortConstraint.inputValueValidity();
        if (errorMsg !== '') {
            throw ErrorHelper.handleNewError(errorMsg);
        }

        this.isEmptyConstraint = isExclusionEmpty && isInclusionEmpty
        return cohortConstraint;
    }

    // send a signal that launches the export of the statistical results as a PDF
    sendExportAsPDFSignal() {
        //TODO if no result is displayed in the explore statistics tab throw an error
        if (!this.navbarService.isExploreStatistics) {
            throw ErrorHelper.handleNewError("Cannot export the PDF outside of the statistics tab.");
        }

        this.exportAsPDF.next(1)
    }


}
