/**
 * Copyright 2020 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//This class describes an interval from a histogram. 
export class ApiInterval {
  encCount: string // the encrypted count of observations that fall within this interval
  higherBound: string
  lowerBound: string
}

//describes a histogram received from the backend after an explore-statistics request
export class ApiExploreStatisticsResponse {

  intervals: ApiInterval[]

  unit: string // the unit of the x-axis of the histogram

  timers: {
    name: string
    milliseconds: number
  }[]
}
