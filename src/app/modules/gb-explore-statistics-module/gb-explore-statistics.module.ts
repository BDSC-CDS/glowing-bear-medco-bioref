/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GbExploreStatisticsComponent} from './gb-explore-statistics.component';
import {routing} from './gb-explore-statistics.routing';
import {RouterModule} from '@angular/router';
import {GbCombinationConstraintComponent} from '../gb-explore-module/constraint-components/gb-combination-constraint/gb-combination-constraint.component';
import {GbConstraintComponent} from '../gb-explore-module/constraint-components/gb-constraint/gb-constraint.component';

import {FormsModule} from '@angular/forms';
import {AutoCompleteModule} from 'primeng/autocomplete';
import {CheckboxModule} from 'primeng/checkbox';
import {CalendarModule} from 'primeng/calendar';
import {PanelModule} from 'primeng/panel';
import {MultiSelectModule} from 'primeng/multiselect';
import {GbSelectionModule} from '../gb-explore-module/gb-selection-component/gb-selection.module';
import { GbExploreStatisticsSettingsComponent } from './panel-components/gb-explore-statistics-settings/gb-explore-statistics-settings.component';
import { ChartComponent, GbExploreStatisticsResultsComponent } from './panel-components/gb-explore-statistics-results/gb-explore-statistics-results.component';
import { AccordionModule, OverlayPanelModule } from 'primeng';
import { ExploreStatisticsService } from '../../services/explore-statistics.service';

@NgModule({
  imports: [
    CommonModule,
    AccordionModule,
    OverlayPanelModule,
    routing,
    FormsModule,
    AutoCompleteModule,
    CheckboxModule,
    CalendarModule,
    PanelModule,
    MultiSelectModule,
    GbSelectionModule
  ],
  exports: [
    RouterModule,

  ],
  declarations: [
    GbExploreStatisticsComponent,
    GbExploreStatisticsSettingsComponent,
    GbExploreStatisticsResultsComponent
  ],
  entryComponents: [
    GbConstraintComponent,
    GbCombinationConstraintComponent,
    ChartComponent
  ]
})

export class GbExploreStatisticsModule {
}
