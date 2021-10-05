/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {Component} from '@angular/core';
import { AuthenticationService } from 'src/app/services/authentication.service';
import {NavbarService} from '../../services/navbar.service';
import {SavedCohortsPatientListService} from '../../services/saved-cohorts-patient-list.service';

@Component({
  selector: 'gb-side-panel',
  templateUrl: './gb-side-panel.component.html',
  styleUrls: ['./gb-side-panel.component.css']
})
export class GbSidePanelComponent {

  constructor(public navbarService: NavbarService,
              public savedCohortsPatientListService: SavedCohortsPatientListService,
              private authService: AuthenticationService) { }

  userHasExploreStatsRole(): boolean {
    return this.authService.hasExploreStatsRole()
  }
}
