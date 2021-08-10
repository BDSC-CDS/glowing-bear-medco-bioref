/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { AutoComplete } from 'primeng/autocomplete';
import { GbConceptFormComponent } from 'src/app/modules/concept-form-component/gb-concept-form.component';
import { ConstraintService } from 'src/app/services/constraint.service';
import { ExploreStatisticsService } from '../../../../services/explore-statistics.service';
import { TreeNodeService } from '../../../../services/tree-node.service';
import { ErrorHelper } from '../../../../utilities/error-helper';

@Component({
  selector: 'gb-explore-statistics-settings',
  templateUrl: './gb-explore-statistics-settings.component.html',
  styleUrls: ['./gb-explore-statistics-settings.component.css'],
})

//This component handles the logic behind the form used to set the parameters of the creation of histogram about the counts of observations for a numerical concept.
export class GbExploreStatisticsSettingsComponent extends GbConceptFormComponent {
  private _isDirty: Boolean = false
  private _numberOfBuckets: number;


  @ViewChild('autoComplete', { static: false }) autoComplete: AutoComplete;
  @ViewChild('autoCompleteContainer', { static: false }) autoCompleteContainer: HTMLElement;

  @Output() changedEventConcepts: EventEmitter<boolean>

  constructor(
    private exploreStatisticsService: ExploreStatisticsService,
    element: ElementRef,
    constraintService: ConstraintService,
    treeNodeService: TreeNodeService) {
    super(constraintService, element, treeNodeService)

    this.changedEventConcepts = super.changedEventConcepts
  }


  set isDirty(isDirty: Boolean) {
    this._isDirty = isDirty
  }

  get isDirty(): Boolean {
    return this._isDirty
  }

  public set numberOfBuckets(value: number) {
    this._numberOfBuckets = value;
  }

  //Executed when the run query button is clicked. It launches the query via the execute query function of the service.
  execQuery(event: Event) {

    if (this._numberOfBuckets < 1) {
      throw ErrorHelper.handleNewError('Please make the number of buckets bigger or equal to 1')
    }

    if (!this.concept) {
      throw ErrorHelper.handleNewError('Please select a concept or modifier used in this query')
    }

    if (this.isDirty) {
      throw ErrorHelper.handleNewError('Please wait for the query that is running to finish its execution')
    }

    this.isDirty = true

    const onDone = () => { this.isDirty = false; }
    try {
      this.exploreStatisticsService.executeQuery(this.concept, onDone)
    } catch (e) {
      onDone()
      throw e
    }
  }
}
