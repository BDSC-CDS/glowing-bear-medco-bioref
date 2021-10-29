/**
 * Copyright 2017 - 2018  The Hyve B.V.
 * Copyright 2020 - 2021 CHUV
 * Copyright 2021 EPFL LDS
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TreeNode } from '../tree-models/tree-node';
import { ConstraintVisitor } from './constraintVisitor';

export class Constraint {

  // Whether or not the shorter text represenstation of the constraint is the same as the longer text representation
  protected shortTextRepresentationIsSimilar = true
  // The textual representation of this constraint
  protected _textRepresentation: string;
  // The shorter textual representation of the constraint. Omitting information like the path of the constraint.
  protected _shortTextRepresentation: string;
  // The parent constraint
  protected _parentConstraint: Constraint;
  // i2b2 timing policiy
  protected _panelTimingSameInstance?: boolean;

  /**
   *  inputValueValidity check that all values needed values are defined for concept with textual or numerical constraint.
   *  Parent class Constraint does not have such field and is by default valid, hence returns a empty string
   */

  inputValueValidity(): string {
    return ''
  }


  constructor() {
    this.textRepresentation = '';
    this.parentConstraint = null;
    this._panelTimingSameInstance = null;
  }


  // visitor pattern https://refactoring.guru/design-patterns/visitor
  accept<T>(v: ConstraintVisitor<T>): T {
    return v.visitConstraint(this)
  }

  get textRepresentation(): string {
    return this._textRepresentation;
  }

  set textRepresentation(value: string) {
    this._textRepresentation = value;

    if(this.shortTextRepresentationIsSimilar) {
      this.shortTextRepresentation = value
    }
  }

  get shortTextRepresentation(): string {
    return this._shortTextRepresentation;
  }

  set shortTextRepresentation(value: string) {
    this._shortTextRepresentation = value;
  }

  get parentConstraint(): Constraint {
    return this._parentConstraint;
  }

  set parentConstraint(value: Constraint) {
    this._parentConstraint = value;
  }

  get className(): string {
    return 'Constraint';
  }
  clone(): Constraint {
    let ret = new Constraint()
    ret.textRepresentation = this.textRepresentation
    ret.panelTimingSameInstance = this.panelTimingSameInstance

    ret.parentConstraint = (this._parentConstraint) ? this._parentConstraint : null
    return ret
  }
  set panelTimingSameInstance(val: boolean) {
    this._panelTimingSameInstance = val
  }

  get panelTimingSameInstance(): boolean {
    return this._panelTimingSameInstance
  }

  /* For the needs of explore statistics requests we need to 'build' analytes (alias concepts or modifiers)
  * from the constraints present in the inclusion criterias. The concepts or modifiers which will be used as analytes of those
  * explore statistics requests will be the one with an 'any' value in the constraint field.
  */
  getAnalytes(): Array<TreeNode> {
    return [];
  }

  // This method recursively traverse the constraints tree. The returned tree contains only constraints which are not analytes.
  // This method can return undefined if the current constraint is an analyte.
  constraintWithoutAnalytes(): Constraint {
    return this
  }


}
