/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { CombinationConstraint } from 'src/app/models/constraint-models/combination-constraint';
import { Constraint } from 'src/app/models/constraint-models/constraint';
import { Utils } from 'src/app/modules/gb-explore-statistics-module/panel-components/gb-explore-statistics-results/gb-explore-statistics-results.component';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { HTMLExportVisitor } from './constraintVisitor/htmlExportVisitor';

@Component({
  selector: 'gb-cohort-definition',
  templateUrl: './gb-cohort-definition.component.html',
  styleUrls: ['./gb-cohort-definition.component.css']
})

export class GbCohortDefinitionComponent implements OnDestroy {

  @ViewChild('testTemplate', { read: ViewContainerRef })
  testTemplate: ViewContainerRef

  private _inclusionConstraintStr: string
  private _exclusionConstraintStr: string

  private testContraint: Constraint
  private testComponentRef: ComponentRef<any>;





  constructor(private exploreStatisticsService: ExploreStatisticsService, private componentFactoryResolver: ComponentFactoryResolver) {
    const defaultRep = new Constraint().textRepresentation
    this.inclusionConstraintStr = defaultRep
    this.exclusionConstraintStr = defaultRep


    this.exploreStatisticsService.inclusionConstraint.subscribe(constraint => {
      this.inclusionConstraintStr = constraint.textRepresentation

      this.testContraint = constraint


    })

    this.exploreStatisticsService.exclusionConstraint.subscribe(constraint => {

      this.exclusionConstraintStr = constraint.textRepresentation
    })
  }



  private transformTextRepresentation(rep: string): string {
    if (rep === undefined || rep === '' || rep == CombinationConstraint.groupTextRepresentation) {
      return 'None'
    }

    return rep
  }


  ngOnDestroy(): void {
    if (this.testComponentRef !== undefined) {
      this.testComponentRef.destroy()
    }
  }


  ngAfterViewInit() {

    if (this.testContraint === undefined) {
      return
    }
    console.log("About to enter the HTMLExportVisitor!")
    const visitor = new HTMLExportVisitor(this.componentFactoryResolver, this.testTemplate)
    this.testComponentRef = this.testContraint.accept(visitor)
    console.log("Test component ref")
  }


  set inclusionConstraintStr(representation: string) {
    this._inclusionConstraintStr = this.transformTextRepresentation(representation)
  }

  set exclusionConstraintStr(representation: string) {
    this._exclusionConstraintStr = this.transformTextRepresentation(representation)
  }

  get inclusionConstraintStr(): string {
    return this._inclusionConstraintStr
  }


  get exclusionConstraintStr(): string {
    return this._exclusionConstraintStr
  }


}
