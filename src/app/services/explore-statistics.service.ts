import { EventEmitter, Injectable, Output } from "@angular/core";
import { forkJoin, Observable } from 'rxjs';
import { timeout, map } from 'rxjs/operators';
import { ApiEndpointService } from "./api-endpoint.service";
import { MedcoNetworkService } from "./api/medco-network.service";
import { CohortService } from "./cohort.service";
import { CryptoService } from "./crypto.service";
import { ApiInterval, ApiExploreStatisticsResponse } from '../models/api-response-models/explore-statistics/explore-statistics-response';
import { ApiExploreStatistics } from '../models/api-request-models/survival-analyis/api-explore-statistics';
import { Concept } from '../models/constraint-models/concept';
import { ErrorHelper } from '../utilities/error-helper';
import { Modifier } from '../models/constraint-models/modifier';

export class Interval {
    count: number
    higherBound: string
    lowerBound: string

    constructor(lowerBound, higherBound, decryptedCount) {
        this.higherBound = higherBound
        this.lowerBound = lowerBound
        this.count = decryptedCount
        console.log("Clear count for [", this.lowerBound, ", ", this.higherBound, "] is ", this.count)
    }
}

export class ChartInformation {
    intervals: Interval[]
    readonly unit: string
    readonly readable: Observable<any>

    constructor(apiResponse: ApiExploreStatisticsResponse, cryptoService: CryptoService, public readonly treeNodeName: string, public readonly cohortName: string) {
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

@Injectable()
export class ExploreStatisticsService {
    constructor(
        private apiEndpointService: ApiEndpointService,
        private cryptoService: CryptoService,
        private cohortService: CohortService,
        private medcoNetworkService: MedcoNetworkService
    ) { }

    //Sends the result of the latest query when is is available
    @Output() ChartDataEmitter: EventEmitter<ChartInformation> = new EventEmitter()

    //1 minute timeout
    private static TIMEOUT_MS = 1000 * 60 * 1;

    private static getNewQueryID(): string {
        let d = new Date()
        return (`Explore_Statistics${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}${d.getUTCHours()}` +
            `${d.getUTCMinutes()}${d.getUTCSeconds()}${d.getUTCMilliseconds()}`)
    }

    executeQuery(concept: Concept, numberOfBuckets: number, onExecuted: () => any) {
        if (!this.cohortService.selectedCohort || !this.cohortService.selectedCohort.name) {
            throw ErrorHelper.handleNewError('Please select a cohort on the left located cohort selection menu.')
        }

        const apiRequest: ApiExploreStatistics = {
            ID: ExploreStatisticsService.getNewQueryID(),
            numberOfBuckets,
            concept: concept.path,
            cohortName: this.cohortService.selectedCohort.name,
            userPublicKey: this.cryptoService.ephemeralPublicKey
        }



        if (concept.modifier) {
            apiRequest.concept = concept.modifier.appliedConceptPath
            apiRequest.modifier = {
                ModifierKey: concept.modifier.path,
                AppliedPath: concept.modifier.appliedPath
            }
        }

        console.log("Api request: ", apiRequest)

        const obs = forkJoin(this.medcoNetworkService.nodes
            .map(
                node =>
                    this.apiEndpointService.postCall(
                        'node/explore-statistics/query',
                        apiRequest,
                        node.url
                    )
            ))
            .pipe(timeout(ExploreStatisticsService.TIMEOUT_MS))


        const displayedName = concept.modifier ? this.getModifierDisplayName(concept.modifier) : concept.name

        obs.subscribe(
            (results: Array<ApiExploreStatisticsResponse>) => {
                console.log("Explore statistics request results ", results)
                if (results == undefined || results.length <= 0) {
                    ErrorHelper.handleNewError("Error with the server. Empty result.")
                }


                //Store the clear counts within the chart information class instance
                const chartInfo = new ChartInformation(results[0], this.cryptoService, displayedName, apiRequest.cohortName)
                chartInfo.readable.subscribe(_ => {
                    //waiting for the intervals to be decrypted by the crypto service to emit the chart information to external listeners.
                    this.ChartDataEmitter.emit(chartInfo)
                    onExecuted()
                })

            },
            err => {
                onExecuted()
            }

        )

    }

    private getModifierDisplayName(m: Modifier): string {
        return m.path.split("/").filter(s => s).pop()
    }

}