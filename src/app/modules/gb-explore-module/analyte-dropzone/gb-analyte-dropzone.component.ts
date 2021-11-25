/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, ElementRef } from '@angular/core';
import { Concept } from 'src/app/models/constraint-models/concept';
import { ValueType } from 'src/app/models/constraint-models/value-type';
import { GbConceptFormComponent } from 'src/app/modules/concept-form-component/gb-concept-form.component';
import { ConstraintService } from 'src/app/services/constraint.service';
import { TreeNodeService } from 'src/app/services/tree-node.service';
import { ErrorHelper } from 'src/app/utilities/error-helper';

@Component({
    templateUrl: './gb-analyte-dropzone.component.html',
    styleUrls: ['./gb-analyte-dropzone.component.css'],
    selector: 'gb-analyte-dropzone'
})

/*
* This component handles the logic behind the form used to set the parameters
* of the creation of histogram about the counts of observations for a numerical concept.
*/
export class GbAnalyteDropzone extends GbConceptFormComponent {


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

        if (!this.validValueType(node.valueType)) {
            ErrorHelper.handleNewError("The node you dropped in this form is not of numerical type.")
            return null
        }

        const dropped = super.onDrop(event)

        //TODO do something with the dropped element

        console.log("Dropped concept in dropzone ", dropped)
        return dropped

    }

    private validValueType(valueType: ValueType): boolean {
        return valueType == ValueType.NUMERICAL
    }

    set suggestedConcepts(concepts: Concept[]) {
        super.suggestedConcepts = concepts
    }

    get suggestedConcepts(): Concept[] {
        const suggested = super.suggestedConcepts
        if (!suggested) {
            return []
        }
        return suggested.filter(c => this.validValueType(c.type))
    }
}
