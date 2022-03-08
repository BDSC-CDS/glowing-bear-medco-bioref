/**
 * Copyright 2017 - 2018  The Hyve B.V.
 * Copyright 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GbMainComponent } from './gb-main.component';
import { GbNavBarModule } from '../gb-navbar-module/gb-navbar.module';
import { GbSidePanelModule } from '../gb-side-panel-module/gb-side-panel.module';
import { routing } from './gb-main.routing';
import { RouterModule } from '@angular/router';
import {CohortService} from '../../services/cohort.service';
import {ConstraintReverseMappingService} from '../../services/constraint-reverse-mapping.service';
import {SurvivalResultsService} from '../../services/survival-results.service';
import { ButtonModule, DialogModule, TooltipModule } from 'primeng';

@NgModule({
  imports: [
    CommonModule,
    routing,
    GbNavBarModule,
    GbSidePanelModule,
    DialogModule,
    ButtonModule
  ],
  declarations: [GbMainComponent],
  exports: [GbMainComponent, RouterModule],
  providers: [CohortService, SurvivalResultsService, ConstraintReverseMappingService]
})
export class GbMainModule {
}
