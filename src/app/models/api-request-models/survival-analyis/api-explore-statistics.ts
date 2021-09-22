/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ApiI2b2Panel } from "../medco-node/api-i2b2-panel"
import { ApiI2b2Timing } from "../medco-node/api-i2b2-timing"

export class ModifierApiObjet {
  ParentConceptPath: string
  ModifierKey: string
  AppliedPath: string
}

export class ApiExploreStatistics {
  ID: string
  userPublicKey: string

  //analytes: concepts and modifiers whose distribution will be computed.
  concepts: Array<string>
  modifiers?: Array<ModifierApiObjet>

  numberOfBuckets: number

  // Similar as the parameter passed to an explore query.
  // The information specified by `cohortDefinition` defines
  // the population upon which the explore statistic is run.
  cohortDefinition: {
    queryTiming: ApiI2b2Timing;
    panels: ApiI2b2Panel[];
  }
}
