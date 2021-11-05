/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { Constraint } from 'src/app/models/constraint-models/constraint';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { HTMLExportVisitor } from './constraintVisitor/htmlExportVisitor';

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
  }



  ngOnDestroy(): void {
    if (this.inclusionComponentRef !== undefined) {
      this.inclusionComponentRef.destroy()
    }

    if (this.exclusionTemplateRef !== undefined) {
      this.exclusionTemplateRef.destroy()
    }
  }


  ngAfterViewInit() {

    if (this.inclusionConstraint === undefined) {
      this.noInclusionConstraint = true
    } else {
      this.noInclusionConstraint = false
      const visitor = new HTMLExportVisitor(this.componentFactoryResolver, this.inclusionTemplate)
      this.inclusionComponentRef = this.inclusionConstraint.accept(visitor)
    }

    if (this.exclusionConstraint === undefined) {
      this.noExclusionConstraint = true
    } else {
      this.noExclusionConstraint = false
      const visitor = new HTMLExportVisitor(this.componentFactoryResolver, this.exclusionTemplate)
      this.exclusionTemplateRef = this.exclusionConstraint.accept(visitor)
    }

  }




}
