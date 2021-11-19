/**
 * Copyright 2017 - 2018  The Hyve B.V.
 * Copyright 2020  LDS EPFL
 * Copyright 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { AfterViewChecked, ChangeDetectorRef, Component, Input } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ApiI2b2Panel } from 'src/app/models/api-request-models/medco-node/api-i2b2-panel';
import { ApiI2b2Timing } from 'src/app/models/api-request-models/medco-node/api-i2b2-timing';
import { CombinationConstraint } from 'src/app/models/constraint-models/combination-constraint';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { ApiQueryDefinition } from '../../models/api-request-models/medco-node/api-query-definition';
import { ApiNodeMetadata } from '../../models/api-response-models/medco-network/api-node-metadata';
import { Cohort } from '../../models/cohort-models/cohort';
import { OperationType } from '../../models/operation-models/operation-types';
import { OperationStatus } from '../../models/operation-status';
import { ExploreQueryType } from '../../models/query-models/explore-query-type';
import { MedcoNetworkService } from '../../services/api/medco-network.service';
import { CohortService } from '../../services/cohort.service';
import { ConstraintService } from '../../services/constraint.service';
import { QueryService } from '../../services/query.service';
import { SavedCohortsPatientListService } from '../../services/saved-cohorts-patient-list.service';
import { ErrorHelper } from '../../utilities/error-helper';
import { FormatHelper } from '../../utilities/format-helper';
import { MessageHelper } from '../../utilities/message-helper';

@Component({
  selector: 'gb-explore',
  templateUrl: './gb-explore.component.html',
  styleUrls: ['./gb-explore.component.css']
})
export class GbExploreComponent implements AfterViewChecked {

  _lastPatientList: [ApiNodeMetadata[], number[][]]

  OperationType = OperationType


  // Bucket size of each interval of the explore statistics histogram
  @Input() bucketSize: number;
  // Minimal observation that will be taken into account in the construction of the explore statistics histogram
  @Input() minObservation: number;


  constructor(
    private authService: AuthenticationService,
    private queryService: QueryService,
    private cohortService: CohortService,
    private medcoNetworkService: MedcoNetworkService,
    public constraintService: ConstraintService,
    private changeDetectorRef: ChangeDetectorRef,
    private savedCohortsPatientListService: SavedCohortsPatientListService,
    private exploreStatisticsService: ExploreStatisticsService) {
    this.exploreStatisticsService.patientQueryIDsSubject.subscribe(resIDs => {
      this.lastSuccessfulSet = resIDs
    })
    this.queryService.lastSuccessfulSet.subscribe(resIDs => {
      this.lastSuccessfulSet = resIDs
    })
    this.queryService.queryResults.subscribe(
      result => {
        if ((result) && (result.patientLists)) {
          this._lastPatientList = [result.nodes, result.patientLists];
        }
      }
    )
  }

  // without this, ExpressionChangedAfterItHasBeenCheckedError when going from Analysis to Explore
  ngAfterViewChecked() {
    this.changeDetectorRef.detectChanges()
  }

  execExploreStatisticsQuery(event) {
    event.stopPropagation();

    this.exploreStatisticsService.executeQueryFromExplore(this.bucketSize, this.minObservation)
  }


  displayExploreStatsButton(): boolean {
    return this.authService.hasExploreStatsRole()
  }

  execQuery(event) {
    event.stopPropagation();

    if (this.displayExploreStatsButton()) {
      this.execExploreStatisticsQuery(event)
      return
    }


    this.queryService.execQuery();
  }

  private saveCohortStatistics() {
    const s = this.exploreStatisticsService
    const combination = combineLatest([s.inclusionConstraint, s.exclusionConstraint])
    combination.pipe(take(1)).subscribe((
      [inclusionConstraint, exclusionConstraint]) => {
      // due to the `take` call this callback is only called once
      //https://stackoverflow.com/questions/53216501/unsubscribe-in-subscribe-callback-function
      const cohort = this.exploreStatisticsService.lastCohortDefinition
      const timing = this.exploreStatisticsService.lastQueryTiming
      this.saveCohort(inclusionConstraint, exclusionConstraint,
        cohort, timing)
    })
  }

  private saveCohortExplore() {
    this.saveCohort(this.constraintService.rootInclusionConstraint,
      this.constraintService.rootExclusionConstraint, this.queryService.lastDefinition, this.queryService.lastTiming)
  }

  private saveCohort(inclusionConstraint: CombinationConstraint, exclusionConstraint: CombinationConstraint,
    cohortDefinition: ApiI2b2Panel[], queryTiming: ApiI2b2Timing) {
    if (this.cohortName === '') {
      throw ErrorHelper.handleNewUserInputError('You must provide a name for the cohort you want to save.');
    } else if (!this.cohortService.patternValidation.test(this.cohortName).valueOf()) {
      throw ErrorHelper.handleNewUserInputError(`Name ${this.cohortName} can only contain alphanumerical symbols (without ö é ç ...) and underscores "_".`);
    }

    let existingCohorts = this.cohortService.cohorts
    if (existingCohorts.findIndex((c => c.name === this.cohortName).bind(this)) !== -1) {
      throw ErrorHelper.handleNewUserInputError(`Name ${this.cohortName} already used.`);
    }

    let creationDates = new Array<Date>()
    let updateDates = new Array<Date>()
    let queryDefinitions = new Array<ApiQueryDefinition>()
    const nunc = Date.now()
    for (let i = 0; i < this.medcoNetworkService.nodes.length; i++) {
      creationDates.push(new Date(nunc))
      updateDates.push(new Date(nunc))
      let definition = new ApiQueryDefinition()
      definition.panels = cohortDefinition
      definition.queryTiming = queryTiming
      queryDefinitions.push(definition)
    }

    let cohort = new Cohort(
      this.cohortName,
      inclusionConstraint,
      exclusionConstraint,
      creationDates,
      updateDates,
    )
    if (queryDefinitions.some(apiDef => (apiDef.panels) || (apiDef.queryTiming))) {
      cohort.queryDefinition = queryDefinitions
    }
    cohort.patient_set_id = this.lastSuccessfulSet
    this.cohortService.postCohort(cohort)
    MessageHelper.alert('success', 'Cohort successfully saved.');

    // handle patient list locally
    if (this._lastPatientList) {
      this.savedCohortsPatientListService.insertPatientList(this.cohortName, this._lastPatientList[0], this._lastPatientList[1])
      this.savedCohortsPatientListService.statusStorage.set(this.cohortName, OperationStatus.done)
    } else {
      MessageHelper.alert('error', 'There is no patient list cached from previous Explore Query. You may have to download the list again.')
    }
    this.cohortName = ''
  }


  save() {
    if (this.authService.hasExploreStatsRole()) {
      this.saveCohortStatistics()
      return
    }

    this.saveCohortExplore()

  }

  saveIfEnter(event) {
    if (event.keyCode === 13) {
      this.save()
    }
  }
  // otherwise writes data in input filed
  preventDefault(event: Event) {
    event.preventDefault()
  }

  get queryType(): ExploreQueryType {
    return this.queryService.queryType;
  }

  set lastSuccessfulSet(setIDs: number[]) {
    this.cohortService.lastSuccessfulSet = setIDs
  }
  get lastSuccessfulSet(): number[] {
    return this.cohortService.lastSuccessfulSet
  }
  get globalCount(): Observable<string> {
    return this.queryService.queryResults.pipe(map((queryResults) =>
      queryResults ? FormatHelper.formatCountNumber(queryResults.globalCount) : '0'
    ));
  }
  set cohortName(name: string) {
    this.cohortService.cohortName = name
  }
  get cohortName(): string {
    return this.cohortService.cohortName
  }

  get isUpdating(): boolean {
    return this.queryService.isUpdating
  }

  get isDirty(): boolean {
    return this.queryService.isDirty
  }

  get hasConstraint(): boolean {
    return this.constraintService.hasConstraint().valueOf()
  }


}
