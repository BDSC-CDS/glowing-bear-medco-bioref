/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { CohortConstraint } from 'src/app/models/constraint-models/cohort-constraint';
import { CombinationConstraint } from 'src/app/models/constraint-models/combination-constraint';
import { ConceptConstraint } from 'src/app/models/constraint-models/concept-constraint';
import { Constraint } from 'src/app/models/constraint-models/constraint';
import { ConstraintVisitor } from 'src/app/models/constraint-models/constraintVisitor';
import { GenomicAnnotationConstraint } from 'src/app/models/constraint-models/genomic-annotation-constraint';
import { NegationConstraint } from 'src/app/models/constraint-models/negation-constraint';
import { TimeConstraint } from 'src/app/models/constraint-models/time-constraint';
import { ValueConstraint } from 'src/app/models/constraint-models/value-constraint';
import { TreeNode } from 'src/app/models/tree-models/tree-node';
import { Utils } from 'src/app/modules/gb-explore-statistics-module/panel-components/gb-explore-statistics-results/gb-explore-statistics-results.component';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { ConstraintHelper } from 'src/app/utilities/constraint-utilities/constraint-helper';
import { HTMLExportVisitor } from './constraintVisitor/htmlExportVisitor';

type AnalytePath = String[]

@Component({
  selector: 'gb-cohort-definition',
  templateUrl: './gb-cohort-definition.component.html',
  styleUrls: ['./gb-cohort-definition.component.css']
})
export class GbCohortDefinitionComponent implements OnDestroy {

  @ViewChild('inclusionTemplate', { read: ViewContainerRef })
  inclusionTemplate: ViewContainerRef

  @ViewChild('exclusionTemplate', { read: ViewContainerRef })
  exclusionTemplate: ViewContainerRef
  @Input()
  noInclusionConstraint: boolean = true;
  @Input()
  noExclusionConstraint: boolean = true;
  @Input()
  analytesPaths: AnalytePath[] = []

  private inclusionConstraint: Constraint
  private exclusionConstraint: Constraint
  private inclusionComponentRef: ComponentRef<any>;
  private exclusionTemplateRef: ComponentRef<any>;



  constructor(private exploreStatisticsService: ExploreStatisticsService, private componentFactoryResolver: ComponentFactoryResolver) {

    this.exploreStatisticsService.inclusionConstraint.subscribe(constraint => {
      this.inclusionConstraint = constraint
    })

    this.exploreStatisticsService.exclusionConstraint.subscribe(constraint => {
      this.exclusionConstraint = constraint
    })

    this.exploreStatisticsService.analytesSubject.subscribe(analytes => {
      const newElements: AnalytePath[] = []
      analytes.forEach(analyte => {
        newElements.push(Utils.extractDisplayablePath(analyte))
      })

      this.analytesPaths = newElements
    })
  }



  ngOnDestroy(): void {
    if (this.inclusionComponentRef !== undefined) {
      this.inclusionComponentRef.destroy()
    }

    if (this.exclusionTemplateRef !== undefined) {
      this.exclusionTemplateRef.destroy()
    }
  }

  private constraintIsEmpty(c: Constraint): boolean {
    if (c === undefined || c === null) {
      return true
    }

    if (!(c instanceof CombinationConstraint)) {
      return false
    }

    //we are dealing with a combination constraint
    const comb = c as CombinationConstraint
    if (comb.children === undefined || comb.children.length === 0) {
      return true
    }

    return !ConstraintHelper.hasNonEmptyChildren(comb)
  }

  ngAfterViewInit() {



    if (this.constraintIsEmpty(this.inclusionConstraint)) {
      this.noInclusionConstraint = true
    } else {
      this.noInclusionConstraint = false
      const visitor = new HTMLExportVisitor(this.componentFactoryResolver, this.inclusionTemplate)
      // const wrapped = this.wrapConstraint(this.inclusionConstraint)
      this.inclusionComponentRef = this.inclusionConstraint.accept(visitor)
    }

    if (this.constraintIsEmpty(this.exclusionConstraint)) {
      this.noExclusionConstraint = true
    } else {
      this.noExclusionConstraint = false
      const visitor = new HTMLExportVisitor(this.componentFactoryResolver, this.exclusionTemplate)
      // const wrapped = this.wrapConstraint(this.exclusionConstraint)
      this.exclusionTemplateRef = this.exclusionConstraint.accept(visitor)
    }

  }
}
