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
import { FormatHelper } from '../../utilities/format-helper';
import { QueryService } from '../../services/query.service';
import { ExploreQueryType } from '../../models/query-models/explore-query-type';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConstraintService } from '../../services/constraint.service';
import {ApiNodeMetadata} from '../../models/api-response-models/medco-network/api-node-metadata';
import {CohortService} from '../../services/cohort.service';
import {SavedCohortsPatientListService} from '../../services/saved-cohorts-patient-list.service';
import {MessageHelper} from '../../utilities/message-helper';
import {Cohort} from '../../models/cohort-models/cohort';
import {OperationStatus} from '../../models/operation-status';
import {OperationType} from '../../models/operation-models/operation-types';
import {ApiQueryDefinition} from '../../models/api-request-models/medco-node/api-query-definition';
import {MedcoNetworkService} from '../../services/api/medco-network.service';
import {ErrorHelper} from '../../utilities/error-helper';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { ConstraintMappingService } from 'src/app/services/constraint-mapping.service';
import { ConstraintReverseMappingService } from 'src/app/services/constraint-reverse-mapping.service';
import { AuthenticationService } from 'src/app/services/authentication.service';

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

  save() {
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
      definition.panels = this.queryService.lastDefinition
      definition.queryTiming = this.queryService.lastTiming
      queryDefinitions.push(definition)
    }

    let cohort = new Cohort(
      this.cohortName,
      this.constraintService.rootInclusionConstraint,
      this.constraintService.rootExclusionConstraint,
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
