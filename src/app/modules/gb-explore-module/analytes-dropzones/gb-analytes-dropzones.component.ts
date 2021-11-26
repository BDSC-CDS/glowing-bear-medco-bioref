/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, ElementRef, Input } from '@angular/core';
import { Concept } from 'src/app/models/constraint-models/concept';
import { ValueType } from 'src/app/models/constraint-models/value-type';
import { TreeNode } from 'src/app/models/tree-models/tree-node';
import { GbConceptFormComponent } from 'src/app/modules/concept-form-component/gb-concept-form.component';
import { ConstraintService } from 'src/app/services/constraint.service';
import { TreeNodeService } from 'src/app/services/tree-node.service';
import { ErrorHelper } from 'src/app/utilities/error-helper';


@Component({
    templateUrl: './gb-analytes-dropzones.component.html',
    styleUrls: ['./gb-analytes-dropzones.component.css'],
    selector: 'gb-analytes-dropzones'
})

export class GbAnalytesDropzones extends GbConceptFormComponent {
    @Input()
    childrenWrappers: TreeNodeWrapper[] = []

    constructor(constraintService: ConstraintService,
        element: ElementRef,
        protected treeNodeService: TreeNodeService) {
        super(constraintService, element, treeNodeService)
    }

    protected onDrop(event: DragEvent): Concept {
        event.preventDefault()
        event.stopPropagation()

        let node = this.treeNodeService.selectedTreeNode
        if (!node) {
            return null
        }

        const dropped = super.onDrop(event)


       if (!GbAnalytesDropzones.validValueType(node.valueType)) {
           ErrorHelper.handleNewError("The node you dropped in this form is not of numerical type.")
           return null
       }

        console.log("Dropped concept in dropzone ", dropped)

        this.pushNewChild(node)

        this.clear()

        return dropped

    }

    private pushNewChild(node: TreeNode) {
        const component = this
        const child = new TreeNodeWrapper(node, this.constraintService, this.treeNodeService)

        // creating a callback for the child which will remove the child out of the children list of the parent component
        const disown = () => {
            const index = component.childrenWrappers.indexOf(child)
            if (index === -1) {
                return
            }
            //removing the child from the list of children of the component.
            component.childrenWrappers.splice(index, 1)
        }

        this.childrenWrappers.push(child)
        child.setOnRemove(disown)
    }

    //cleaning the input field
    clear() {
        if (!this.concept) {
            return
        }
        this.concept.path = null
        this.concept = null
    }

    onSelect(selected: TreeNode) {
        if (!selected) {
            return
        }

        this.pushNewChild(selected)

        this.clear()
    }

    set concept(concept: Concept) {
        super.concept = concept
        console.log("new concept value ", this.concept)
    }


    set wrapperTreeNode(event) {
        console.log(event)
    }

    public static validValueType(valueType: ValueType): boolean {
        return valueType === ValueType.NUMERICAL
    }

    set suggestedConcepts(concepts: Concept[]) {
        super.suggestedConcepts = concepts
    }

    get suggestedConcepts(): Concept[] {
        const suggested = super.suggestedConcepts
        if (!suggested) {
            return []
        }
        return suggested.filter(c => GbAnalytesDropzones.validValueType(c.type))
    }
}



//TODO comment logic
class TreeNodeWrapper extends GbAnalytesDropzones {

    private _treeNode: TreeNode
    clonedTreeNode: TreeNode;

    onRemove: () => void = () => {}

    constructor(treeNode: TreeNode,
        constraintService: ConstraintService,
        protected treeNodeService: TreeNodeService,
    ) {
        super(constraintService, undefined, treeNodeService)
        this.treeNode = treeNode
    }

    get treeNode(): TreeNode {
        //copying basic fields
        return this._treeNode
    }

    set treeNode(treeNode: TreeNode) {
        this._treeNode = treeNode
    }

    setOnRemove(onRemove: () => void) {
        this.onRemove = onRemove
    }


    //called whenever a tree node is dropped on a dropzone that was previously filled with another tree node
    onDrop(event: DragEvent) {
        event.preventDefault()
        event.stopPropagation()
        this.eventHovering = false

        let node = this.treeNodeService.selectedTreeNode
        if (!node) {
            return null
        }

        if (!GbAnalytesDropzones.validValueType(node.valueType)) {
            ErrorHelper.handleNewError("The node you dropped in this form is not of numerical type.")
            return null
        }

        this.treeNode = node


    }


    label() {
        return this._treeNode.label
    }

}