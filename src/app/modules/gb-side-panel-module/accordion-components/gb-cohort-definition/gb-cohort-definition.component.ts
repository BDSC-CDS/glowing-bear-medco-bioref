/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component } from '@angular/core';
import { CombinationConstraint } from 'src/app/models/constraint-models/combination-constraint';
import { Constraint } from 'src/app/models/constraint-models/constraint';
import { ExploreStatisticsService } from 'src/app/services/explore-statistics.service';

@Component({
  selector: 'gb-cohort-definition',
  templateUrl: './gb-cohort-definition.component.html',
  styleUrls: ['./gb-cohort-definition.component.css']
})

export class GbCohortDefinitionComponent {

  private _inclusionConstraint: string
  private _exclusionConstraint: string


  private transformTextRepresentation(rep: string): string {
    if (rep === undefined || rep === '' || rep == CombinationConstraint.groupTextRepresentation) {
      return 'None'
    }

    return rep
  }

  constructor(private exploreStatisticsService: ExploreStatisticsService) {
    const defaultRep = new Constraint().textRepresentation
    this.inclusionConstraint = defaultRep
    this.exclusionConstraint = defaultRep

    this.exploreStatisticsService.inclusionConstraint.subscribe(constraint => {
      this.inclusionConstraint = constraint.textRepresentation
    })

    this.exploreStatisticsService.exclusionConstraint.subscribe(constraint => {
      this.exclusionConstraint = constraint.textRepresentation
    })
  }

  set inclusionConstraint(representation: string) {
    this._inclusionConstraint = this.transformTextRepresentation(representation)
  }

  set exclusionConstraint(representation: string) {
    this._exclusionConstraint = this.transformTextRepresentation(representation)
  }

  get inclusionConstraint(): string {
    return this._inclusionConstraint
  }


  get exclusionConstraint(): string {
    return this._exclusionConstraint
  }

}
