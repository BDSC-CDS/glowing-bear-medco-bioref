/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export class ModifierApiObjet {
  ModifierKey: string
  AppliedPath: string
}

export class ApiExploreStatistics {
  ID: string
  userPublicKey: string
  cohortName: string
  concept: string
  numberOfBuckets: number
  modifier?: ModifierApiObjet
}
