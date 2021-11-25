/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnInit, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { Concept } from '../../models/constraint-models/concept';
import { ConstraintService } from '../../services/constraint.service';
import { UIHelper } from '../../utilities/ui-helper';
import { AutoComplete } from 'primeng/autocomplete';
import { TreeNodeService } from '../../services/tree-node.service';
import { MessageHelper } from '../../utilities/message-helper';
import { ConceptConstraint } from '../../models/constraint-models/concept-constraint';
import { TreeNodeType } from '../../models/tree-models/tree-node-type';

// TODO use this component using composition in survival curves.
// for reference see how to define abstract component:
// https://medium.com/@ozak/stop-repeating-yourself-in-angular-how-to-create-abstract-components-9726d43c99ab
export class GbConceptFormComponent implements OnInit, OnChanges {
  private _concept: Concept

  private _suggestedConcepts: Concept[]
  private _activated: boolean

  protected changedEventConcepts: EventEmitter<boolean>

  private _eventHovering: boolean;


  @ViewChild('autoComplete', { static: false }) autoComplete: AutoComplete;
  @ViewChild('autoCompleteContainer', { static: false }) autoCompleteContainer: HTMLElement;




  constructor(private constraintService: ConstraintService,
    private element: ElementRef,
    protected treeNodeService: TreeNodeService) {
    this.changedEventConcepts = new EventEmitter()
    this._eventHovering = false
  }

  private emitChange() {
    this.changedEventConcepts.emit(this.changeInformation())
  }

  private changeInformation(): boolean {
    return this.concept !== undefined
  }


  protected onDrop(event: DragEvent): Concept {
    event.preventDefault()
    event.stopPropagation()
    this._eventHovering = false
    let node = this.treeNodeService.selectedTreeNode
    if (!node) {
      return null
    }


    if (node.encryptionDescriptor.encrypted) {
      MessageHelper.alert('warn', 'Cannot select this concept as it is encrypted')
      return
    }

    switch (node.nodeType) {
      case TreeNodeType.CONCEPT:
      case TreeNodeType.CONCEPT_FOLDER:
      case TreeNodeType.MODIFIER:
      case TreeNodeType.MODIFIER_FOLDER:
        let constraint = this.constraintService.generateConstraintFromTreeNode(node, node ? node.dropMode : null)
        let concept = (<ConceptConstraint>constraint).clone().concept
        return concept
      case TreeNodeType.CONCEPT_CONTAINER:
      case TreeNodeType.MODIFIER_CONTAINER:
        MessageHelper.alert('warn', `${node.displayName} is a container and cannot be used`)
        break;
      default:
        break;
    }
  }


  ngOnInit() {
    // this.emitChange() //TODO is this useful for the moment it causes an error.
  }

  ngOnChanges() {

  }


  search(event) {
    let results = this.constraintService.searchAllConstraints(event.query);
    this.suggestedConcepts = results
      .filter(constraint => constraint instanceof ConceptConstraint)
      .map(constraint => (constraint as ConceptConstraint).concept);
    UIHelper.removePrimeNgLoaderIcon(this.element, 200)
  }


  onDragOver(event: DragEvent) {
    event.preventDefault()
    this._eventHovering = true
  }

  onDragLeave(event: DragEvent) {
    this._eventHovering = false
  }



  onConceptDrop(event: DragEvent) {
    let concept = this.onDrop(event)
    if (concept) {
      this._concept = concept
    }
  }

  onDropdown(event) {
    UIHelper.removePrimeNgLoaderIcon(this.element, 200);
  }


  @Input()
  set activated(bool: boolean) {
    this._activated = bool
  }

  get activated(): boolean {
    return this._activated
  }

  get eventHovering(): boolean {
    return this._eventHovering
  }


  set suggestedConcepts(concepts: Concept[]) {
    this._suggestedConcepts = concepts
  }

  get suggestedConcepts(): Concept[] {
    return this._suggestedConcepts
  }


  get concept(): Concept {
    return this._concept
  }

  set concept(concept: Concept) {
    this._concept = concept
    this.emitChange()
  }
}
