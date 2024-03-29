/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { combineLatest, forkJoin, Observable, Subject } from 'rxjs';
import { ExploreQueryService } from './api/medco-node/explore-query.service';
import { MedcoNetworkService } from './api/medco-network.service';
import { ConstraintService } from './constraint.service';
import { ExploreCohortsService } from './api/medco-node/explore-cohorts.service';
import { ConstraintReverseMappingService } from './constraint-reverse-mapping.service';
import { MessageHelper } from '../utilities/message-helper';
import { ConceptConstraint } from '../models/constraint-models/concept-constraint';
import { Cohort } from '../models/cohort-models/cohort';
import { Constraint } from '../models/constraint-models/constraint';
import { ApiI2b2Timing } from '../models/api-request-models/medco-node/api-i2b2-timing';
import { ApiCohortResponse } from '../models/api-response-models/medco-node/api-cohort-response';
import { CombinationState } from '../models/constraint-models/combination-state';
import { CombinationConstraint } from '../models/constraint-models/combination-constraint';
import { ApiCohort } from '../models/api-request-models/medco-node/api-cohort';
import { ErrorHelper } from '../utilities/error-helper';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiI2b2Panel } from '../models/api-request-models/medco-node/api-i2b2-panel';
import { ApiQueryDefinition } from '../models/api-request-models/medco-node/api-query-definition';
import { SavedCohortsPatientListService } from './saved-cohorts-patient-list.service';
import { ApiNodeMetadata } from '../models/api-response-models/medco-network/api-node-metadata';
import { OperationStatus } from '../models/operation-status';
import { QueryService } from './query.service';
import { ExploreStatisticsService } from './explore-statistics.service';
import { take } from 'rxjs/operators';
import { equal } from 'mathjs';
import { stringify } from 'querystring';

@Injectable()
export class CohortService {

  private _cohorts: Array<Cohort>
  private _selectedCohort: Cohort
  private _nodeName: Array<string>

  private _isRefreshing: boolean

  // internal states of the explore component handling cohorts
  _cohortName: string
  _lastSuccessfulSet: number[]

  // term restoration
  public restoring: Subject<boolean>
  private _queryTiming: Subject<ApiI2b2Timing>
  private _panelTimings: Subject<ApiI2b2Timing[]>


  private _lastPatientList: [ApiNodeMetadata[], number[][]]

  // constraint on cohort name
  _patternValidation: RegExp


  private static apiCohortsToCohort(apiCohorts: ApiCohortResponse[][]): Cohort[] {

    const cohortNumber = apiCohorts[0].length
    apiCohorts
      .forEach(apiCohort => {
        if (apiCohort.length !== cohortNumber) {
          throw ErrorHelper.handleNewError('cohort numbers are not the same across nodes')
        }
      })

    let cohortName: string
    let creationDate: string
    let updateDate: string

    let res = new Array<Cohort>()
    for (let i = 0; i < cohortNumber; i++) {
      let creationDates = new Array<Date>()
      let updateDates = new Array<Date>()

      cohortName = apiCohorts[0][i].cohortName
      apiCohorts.forEach(apiCohort => {
        if (apiCohort[i].cohortName !== cohortName) {
          throw ErrorHelper.handleNewError('Cohort names are not the same across nodes')
        }
      })
      creationDate = apiCohorts[0][i].creationDate
      apiCohorts.forEach(apiCohort => {
        if (apiCohort[i].creationDate !== creationDate) {
          MessageHelper.alert('warn', 'Cohort creation dates are not the same across nodes')
        }
        creationDates.push(new Date(apiCohort[i].creationDate))
      })
      updateDate = apiCohorts[0][i].updateDate
      apiCohorts.forEach(apiCohort => {
        if (apiCohort[i].updateDate !== updateDate) {
          MessageHelper.alert('warn', 'cohort update dates are not the same across nodes')
        }
        updateDates.push(new Date(apiCohort[i].updateDate))
      })

      let cohort = new Cohort(cohortName, null, creationDates, updateDates)

      cohort.patient_set_id = apiCohorts.map(apiCohort => apiCohort[i].queryID)
      cohort.queryDefinition = apiCohorts.map(apiCohort => apiCohort[i].queryDefinition)
      cohort.predefined = apiCohorts.map(apiCohort => apiCohort[i].predefined).some(value => value)
      res.push(cohort)

    }
    return res

  }

  /**
   * unflattenConstraints check if the root constraints are made of a simple concept constraint,
   * or AND-composed consrtaints. If it is the case, it unflattens them into AND-composed OR-composed combinations
   *
   * @param flatConstraint
   * @returns {Constraint}
   *
   */
  private static unflattenConstraints(flatConstraint: Constraint): Constraint {
    if (!(flatConstraint)) {
      return null
    }
    if (!(flatConstraint instanceof CombinationConstraint)) {
      let newCombination = new CombinationConstraint()
      newCombination.combinationState = CombinationState.And
      newCombination.panelTimingSameInstance = flatConstraint.panelTimingSameInstance
      let newLevel2Combination = new CombinationConstraint()
      newLevel2Combination.combinationState = CombinationState.Or
      newLevel2Combination.addChild(flatConstraint)
      newLevel2Combination.excluded = flatConstraint.excluded
      newCombination.addChild(newLevel2Combination)
      return newCombination

    }
    let newAndCombination = flatConstraint.clone()
    for (let i = 0; i < (flatConstraint as CombinationConstraint).children.length; i++) {
      const childConstraint = (flatConstraint as CombinationConstraint).children[i]
      if (childConstraint instanceof ConceptConstraint) {
        let newConstraint = new CombinationConstraint()
        newConstraint.combinationState = CombinationState.Or
        newConstraint.excluded = childConstraint.excluded
        newConstraint.panelTimingSameInstance = childConstraint.panelTimingSameInstance;
        newConstraint.addChild((newAndCombination as CombinationConstraint).children[i]);
        (newAndCombination as CombinationConstraint).updateChild(i, newConstraint)
      }
    }

    return newAndCombination

  }

  constructor(
    private exploreCohortsService: ExploreCohortsService,
    private queryService: QueryService,
    private medcoNetworkService: MedcoNetworkService,
    private constraintService: ConstraintService,
    private constraintReverseMappingService: ConstraintReverseMappingService,
    private savedCohortsPatientListService: SavedCohortsPatientListService) {
    this.restoring = new Subject<boolean>()
    this._queryTiming = new Subject<ApiI2b2Timing>()
    this._panelTimings = new Subject<ApiI2b2Timing[]>()
    this._nodeName = new Array<string>(this.medcoNetworkService.nodes.length)
    this.medcoNetworkService.nodes.forEach((apiMetadata => {
      this._nodeName[apiMetadata.index] = apiMetadata.name
    }).bind(this))
    this._patternValidation = new RegExp('^\\w+$')
    this._cohorts = new Array<Cohort>()

    this.queryService.queryResults.subscribe(
      result => {
        if ((result) && (result.patientLists)) {
          this._lastPatientList = [result.nodes, result.patientLists];
        }
      }
    )
  }




  saveCohortExplore() {
    this.saveCohort(this.constraintService.rootConstraint, this.queryService.lastDefinition, this.queryService.lastTiming)
  }


  saveCohort(rootConstraint: CombinationConstraint,
    cohortDefinition: ApiI2b2Panel[], queryTiming: ApiI2b2Timing) {
    if (this.cohortName === '') {
      throw ErrorHelper.handleNewUserInputError('You must provide a name for the cohort you want to save.');
    } else if (!this.patternValidation.test(this.cohortName).valueOf()) {
      throw ErrorHelper.handleNewUserInputError(`Name ${this.cohortName} can only contain alphanumerical symbols (without ö é ç ...) and underscores '_'.`);
    }

    let existingCohorts = this.cohorts
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
      rootConstraint,
      creationDates,
      updateDates,
    )
    if (queryDefinitions.some(apiDef => (apiDef.panels) || (apiDef.queryTiming))) {
      cohort.queryDefinition = queryDefinitions
    }
    cohort.patient_set_id = this.lastSuccessfulSet
    this.postCohort(cohort)
    MessageHelper.alert('success', 'Cohort successfully saved.');

    // handle patient list locally
    if (this._lastPatientList) {
      this.savedCohortsPatientListService.insertPatientList(this.cohortName, this._lastPatientList[0], this._lastPatientList[1])
      this.savedCohortsPatientListService.statusStorage.set(this.cohortName, OperationStatus.done)
    }
    this.cohortName = ''
  }

  get cohorts() {
    return this._cohorts
  }
  get selectedCohort() {
    return this._selectedCohort
  }
  set selectedCohort(cohort: Cohort) {
    if (this._selectedCohort) {
      this._selectedCohort.selected = false

      if (this._selectedCohort === cohort) {
        this._selectedCohort = undefined
        return
      }

    }
    this._selectedCohort = cohort
    if (cohort) {
      this._selectedCohort.selected = true
    }
  }

  set cohorts(cohorts: Array<Cohort>) {
    this._cohorts = cohorts.map(x => x)
  }
  get isRefreshing(): boolean {
    return this._isRefreshing
  }

  set lastSuccessfulSet(setIDs: number[]) {
    this._lastSuccessfulSet = setIDs
  }

  get lastSuccessfulSet(): number[] {
    return this._lastSuccessfulSet
  }

  set cohortName(name: string) {
    this._cohortName = name
  }

  get cohortName(): string {
    return this._cohortName
  }

  get queryTiming(): Observable<ApiI2b2Timing> {
    return this._queryTiming.asObservable()
  }

  get panelTimings(): Observable<ApiI2b2Timing[]> {
    return this._panelTimings.asObservable()
  }

  get patternValidation(): RegExp {
    return this._patternValidation
  }

  private handleDefaultCohortNames(names: string[]): void {
    this.cohorts.forEach(((_, i) => {
      this.cohorts[i].defaulted = false
    }).bind(this))
    const allTheSame = names.every(value => value === names[0])
    if (!allTheSame) {
      names.join(', ')
      throw ErrorHelper.handleNewError(`The name of the default cohort is not the same across the nodes: ${names.join(', ')}`)
    }

    if (names[0] === '') {
      MessageHelper.alert('info', 'No default cohort/filter for the current user.')
      return
    }
    MessageHelper.alert('info', `Cohort/filter ${names[0]} defined as default.`)

    let found = false
    this.cohorts.forEach(((value, i) => {
      if (value.name === names[0]) {
        this.cohorts[i].defaulted = true
        found = true
        this.restoreTerms(value)
      }
    }).bind(this))
    if (!found) {
      throw ErrorHelper.handleNewError(`default cohort/filter ${names[0]} not found.`)
    }
    return
  }

  getCohorts() {
    this._isRefreshing = true
    let cohorts$ = this.exploreCohortsService.getCohortAllNodes()
    let defaultCohort$ = this.exploreCohortsService.getDefaultCohortAllNodes()
    forkJoin([cohorts$, defaultCohort$]).subscribe({
      next: (([apiCohorts, defaultCohortNames]) => {
        try {
          this.updateCohorts(CohortService.apiCohortsToCohort(apiCohorts))
          this.handleDefaultCohortNames(defaultCohortNames)
        } catch (err) {
          MessageHelper.alert('error', 'An error occured with received saved cohorts', (err as Error).message)
        }
        this._isRefreshing = false
      }).bind(this),
      error: (err => {
        MessageHelper.alert('error', 'An error occured while retrieving saved cohorts', (err as HttpErrorResponse).error.message)
        this._isRefreshing = false

      }).bind(this),
      complete: (() => {
        MessageHelper.alert('success', 'Saved cohorts successfully retrieved')
        this._isRefreshing = false
      }).bind(this)
    })
  }

  setDefaultCohort(cohort: Cohort) {
    this.exploreCohortsService.putDefaultCohortAllNodes(cohort.name).subscribe({
      next: (message => {
        this.cohorts.forEach(
          ((cohort_, i) => {
            this.cohorts[i].defaulted = (cohort_.name === cohort.name)
          }).bind(this)
        )
        console.log('on remove cohort, message: ', message)
      }).bind(this),
      error: err => MessageHelper.alert('error', 'An error occured while setting default cohort/filter ',
      (err as HttpErrorResponse).error.message)
    })
  }

  postCohort(cohort: Cohort) {
    if (cohort.predefined) {
      MessageHelper.alert('error', `Modifying predefined filter ${cohort.name} is not allowed.`)
      return
    }
    let apiCohorts = new Array<ApiCohort>()
    this._isRefreshing = true
    let cohortName = cohort.name
    this.medcoNetworkService.nodes.forEach((_, index) => {
      let apiCohort = new ApiCohort()
      apiCohort.queryID = cohort.patient_set_id[index]

      apiCohort.creationDate = cohort.updateDate[index].toISOString()
      apiCohort.updateDate = cohort.updateDate[index].toISOString()
      apiCohorts.push(apiCohort)
    })

    this.exploreCohortsService.postCohortAllNodes(cohortName, apiCohorts).subscribe(messages => {
      messages.forEach(message => console.log('on post cohort, message: ', message)),
        this.updateCohorts([cohort])
      this._isRefreshing = false
    },
      error => {
        MessageHelper.alert('error', 'An error occured while saving cohort', (error as HttpErrorResponse).error.message)
        this._isRefreshing = false
      })

  }

  updateCohorts(cohorts: Cohort[]) {
    let tmp = new Map<string, Date>()
    this._cohorts.forEach(cohort => {
      tmp.set(cohort.name, cohort.lastUpdateDate())
    })
    cohorts.forEach(newCohort => {
      if (tmp.has(newCohort.name)) {
        const localDate = tmp.get(newCohort.name)
        const remoteDate = newCohort.lastUpdateDate()
        if (remoteDate >= localDate) {
          let i = this._cohorts.findIndex(c => c.name === newCohort.name)
          this._cohorts[i] = newCohort
        } else {
          MessageHelper.alert('warn', `New version of cohort ${newCohort.name} was skipped for update because its update date is less recent than the one of existing cohort: ` +
            `local version date: ${localDate.toISOString()}, remote version ${remoteDate.toISOString()}`)
        }
      } else {
        this._cohorts.push(newCohort)
        tmp.set(newCohort.name, newCohort.lastUpdateDate())
      }
    })

  }

  removeCohorts(cohort: Cohort) {
    if (cohort.predefined) {
      MessageHelper.alert('error', `Deleting predefined filter ${cohort.name} is not allowed.`)
      return
    }
    this.exploreCohortsService.removeCohortAllNodes(cohort.name).subscribe(
      message => {
        console.log('on remove cohort, message: ', message)
      },
      err => {
        MessageHelper.alert('error', 'An error occured while removing saved cohorts', (err as HttpErrorResponse).error.message)
      }
    )
  }




  // from view to cached

  addCohort(name: string) {

  }

  updateCohortTerms(constraint: CombinationConstraint) {
    this._selectedCohort.rootConstraint = constraint
  }


  // from cached to view
  restoreTerms(cohors: Cohort): void {

    let cohortDefinition = cohors.mostRecentQueryDefinition()
    if (!cohortDefinition) {
      MessageHelper.alert('warn', `Definition not found for cohort ${cohors.name}`)
      return
    }

    this._queryTiming.next(cohortDefinition.queryTiming)
    this.constraintReverseMappingService.mapPanels(cohortDefinition.panels)
      .subscribe(constraint => {
        constraint = CohortService.unflattenConstraints(constraint)
        if (constraint) {
          if (constraint instanceof ConceptConstraint) {
            this.constraintService.rootConstraint.addChild(constraint)
          } else {
            this.constraintService.rootConstraint = (constraint as CombinationConstraint);
            this.constraintService.rootConstraint.isRoot = true
          }
        }
      })
    this.restoring.next(true)
  }
}
