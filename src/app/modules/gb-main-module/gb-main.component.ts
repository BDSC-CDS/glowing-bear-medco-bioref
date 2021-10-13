/**
 * Copyright 2017 - 2018  The Hyve B.V.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, ViewChild, OnInit } from '@angular/core';
import { AuthenticationService } from '../../services/authentication.service';
import { ConstraintService } from '../../services/constraint.service';
import { TreeNodeService } from '../../services/tree-node.service';
import { QueryService } from '../../services/query.service';
import { AppConfig } from '../../config/app.config';
import { NavbarService } from 'src/app/services/navbar.service';

@Component({
  selector: 'gb-main',
  templateUrl: './gb-main.component.html',
  styleUrls: ['./gb-main.component.css']
})
export class GbMainComponent implements OnInit {

  @ViewChild('parentContainer', { static: true }) parentContainer: any;
  @ViewChild('leftPanel', { static: true }) leftPanel: any;
  @ViewChild('gutter', { static: true }) gutter: any;
  @ViewChild('rightPanel', { static: true }) rightPanel: any;

  isGutterDragged: boolean;
  x_pos: number; // Stores x coordinate of the mouse pointer
  x_gap: number; // Stores x gap (edge) between mouse and gutter

  constructor(public authenticationService: AuthenticationService,
    private treeNodeService: TreeNodeService,
    private constraintService: ConstraintService,
    private queryService: QueryService,
    private navbarService: NavbarService,
    private config: AppConfig) {
  }


  ngOnInit() {
    const parentContainerElm = this.parentContainer.nativeElement;
    this.isGutterDragged = false;
    this.x_pos = 0;
    this.x_gap = 0;

    this.gutter.nativeElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    parentContainerElm.addEventListener('mousemove', this.onMouseMove.bind(this));
    parentContainerElm.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onMouseDown = function (event) {
    // preventDefault() is used to
    // prevent browser change cursor icon while dragging
    event.preventDefault();
    const gutterElm = this.gutter.nativeElement;
    this.isGutterDragged = true;
    this.x_gap = this.x_pos - gutterElm.offsetLeft;
    return false;
  };

  onMouseUp = function (event) {
    this.isGutterDragged = false;
  };

  onResize = function (event) {
    const leftPanelElm = this.leftPanel.nativeElement;
    const rightPanelElm = this.rightPanel.nativeElement;
    if (leftPanelElm.style.width !== '') {
      leftPanelElm.style.width = '';
    }
    if (rightPanelElm.style.width !== '') {
      rightPanelElm.style.width = '';
    }
    this.adjustNavbarWidth();
  };

  onMouseMove = function (event) {
    const parentContainerElm = this.parentContainer.nativeElement;
    const leftPanelElm = this.leftPanel.nativeElement;
    const rightPanelElm = this.rightPanel.nativeElement;
    this.x_pos = event.pageX;
    if (this.isGutterDragged) {
      let leftW = this.x_pos - this.x_gap;
      leftPanelElm.style.width = leftW + 'px';
      let bound = parentContainerElm.getBoundingClientRect();
      let rightW = bound.width - leftW - 10 - 2 * 3;
      rightPanelElm.style.width = rightW + 'px';
      this.adjustNavbarWidth();
    }
  };

  adjustNavbarWidth = function () {
    const parentContainerElm = this.parentContainer.nativeElement;
    const leftPanelElm = this.leftPanel.nativeElement;
    const rightPanelElm = this.rightPanel.nativeElement;
    const navbar = parentContainerElm.querySelector('.gb-navbar');
    if (navbar) {
      const leftWidth = leftPanelElm.clientWidth;
      const rightWidth = rightPanelElm.clientWidth;
      const percentage = rightWidth / (rightWidth + leftWidth + 36);
      navbar.style.width = (percentage * 100) + '%';
    }
  };

  inExploreStatsTab(): boolean {
    return this.navbarService.isExploreStatistics
  }

  get footerText(): string {
    let footerText = this.config.getConfig('footer-text');
    return footerText ? footerText : '';
  }

}
