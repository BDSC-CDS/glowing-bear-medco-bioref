/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {Component, ElementRef, AfterViewInit, ViewChild, AfterViewChecked, Output} from '@angular/core';
import {TreeNode} from '../../../../models/tree-models/tree-node';
import {OverlayPanel} from 'primeng';
import {trigger, transition, animate, style} from '@angular/animations';
import {DropMode} from '../../../../models/drop-mode';
import {TreeNodeService} from '../../../../services/tree-node.service';
import {QueryService} from '../../../../services/query.service';
import {ConstraintService} from '../../../../services/constraint.service';
import {TreeNodeType} from '../../../../models/tree-models/tree-node-type';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';
import { Constraint } from 'src/app/models/constraint-models/constraint';

@Component({
  selector: 'gb-cohort-definition',
  templateUrl: './gb-cohort-definition.component.html',
  styleUrls: ['./gb-cohort-definition.component.css']
})

export class GbCohortDefinitionComponent implements AfterViewInit, AfterViewChecked {

  inclusionConstraint: string = new Constraint().textRepresentation
  exclusionConstraint: string = new Constraint().textRepresentation

  constructor(private exploreStatisticsService: ExploreStatisticsService) {
    this.exploreStatisticsService.inclusionConstraint.subscribe(constraint => {
      this.inclusionConstraint = constraint.textRepresentation
    })

    this.exploreStatisticsService.exclusionConstraint.subscribe(constraint => {
      this.exclusionConstraint = constraint.textRepresentation
    })
  }

  ngAfterViewInit() {
  }

  ngAfterViewChecked() {
  }

}
