import { AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, Type, ViewChild, ViewContainerRef } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { CohortConstraint } from "src/app/models/constraint-models/cohort-constraint";
import { CombinationConstraint } from "src/app/models/constraint-models/combination-constraint";
import { CombinationState } from "src/app/models/constraint-models/combination-state";
import { ConceptConstraint } from "src/app/models/constraint-models/concept-constraint";
import { Constraint } from "src/app/models/constraint-models/constraint";
import { ConstraintVisitor } from "src/app/models/constraint-models/constraintVisitor";
import { GenomicAnnotationConstraint } from "src/app/models/constraint-models/genomic-annotation-constraint";
import { NegationConstraint } from "src/app/models/constraint-models/negation-constraint";
import { TimeConstraint } from "src/app/models/constraint-models/time-constraint";
import { ValueConstraint } from "src/app/models/constraint-models/value-constraint";
import { TreeNode } from "src/app/models/tree-models/tree-node";
import { Utils } from "src/app/modules/gb-explore-statistics-module/panel-components/gb-explore-statistics-results/gb-explore-statistics-results.component";


const ulLeftPadding = '2em';

@Component({
    styles: [
        `
        li {
            display: inline-block;
        }
        .delimiter {
            padding-right: .5em;
        }
        `,
        'ul {padding-left: '+ulLeftPadding+'; }'
    ],
    template: `
    <div>
        <ul>
            <li *ngFor="let elem of pathElements; let i = index">
                <span> {{elem}} </span>
                <span *ngIf="!isLastElement(i)" class="delimiter"> &gt; </span>
            </li>
        </ul>
    </div>
    `
})
export class ConceptConstraintSummaryComponent {
    @Input()
    pathElements: string[] = []
    @Input()
    displayName: string;

    constructor(private ref: ChangeDetectorRef) {}

    isLastElement(index: number): boolean {
        return this.pathElements.length === (index + 1)
    }

    set conceptPath(pathElements: string[]) {
        this.pathElements = pathElements
        this.ref.detectChanges()
    }
}


@Component({
    styles: [
        `span {
            color: var(--gb-clinical-green);
            background-color: transparent;
            border-color: var(--gb-clinical-green);
            text-align: center;
            white-space: nowrap;
            vertical-align: middle;
            border: 1px solid;
            font-size: 1rem;
            border-radius: 0.25rem;
            padding: 0.1em .5em;
            font-style:italic;
        }`,
        `div {
            margin-bottom: 1em;
        }`
    ],
    template: `
    <div>
        <span>
            {{operator}}
        </span>
    </div>
    `

})
export class OperatorComponent {
    operator: string

    set state(state: CombinationState) {
        switch (state) {
            case CombinationState.And:
                this.operator = 'and'
                break;
            case CombinationState.Or:
                this.operator = 'or'
                break;
            default:
                this.operator = 'unknown operator'
                console.error("We should not be there missing case!")
                break
        }
    }

}

//todo create a variable out of the border color
@Component({
    styles: [
        `
        .combinationConstraint {
            padding: .5em;
            transition: .3s;
            border-left: transparent solid;
            margin-top: .5em;
            margin-bottom: .5em;
        }
        .combinationConstraint .combinationConstraint {
            margin-left: 2em;
        }
        .combinationConstraint:hover {
            border-left: rgba(255, 160, 71, 0.6) solid;
        }
        `
    ],
    template: `
    <div class="combinationConstraint">
        <ng-template #childrenContainer>
        </ng-template>
    </div>
    `
})
export class CombinationConstraintSummaryComponent implements OnDestroy, AfterViewInit {


    @Input()
    children: ComponentRef<any>[] = []

    _state: CombinationState

    @ViewChild('childrenContainer', { read: ViewContainerRef }) //TODO test if can set this field as private
    childrenContainer: ViewContainerRef;

    private containerRefSubject: Subject<ViewContainerRef> = new Subject()

    constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

    set state(state: CombinationState) {
        this._state = state
    }

    addOperator() {
        const operatorComponent = Utils.buildComponent(this.componentFactoryResolver, this.childrenContainer, OperatorComponent)
        operatorComponent.instance.state = this._state
        this.children.push(operatorComponent)
    }

    ngAfterViewInit() {
        this.containerRefSubject.next(this.childrenContainer)
    }

    get containerRef(): Observable<ViewContainerRef> {
        return this.containerRefSubject
    }

    ngOnDestroy(): void {
        if (!this.children) {
            return
        }

        this.children.forEach(c => c.destroy())
    }

}

@Component({
    template: `
    <div>{{textRepresentation}}</div>
`})
@Input()
export class SimpleConceptSummaryComponent {
    textRepresentation: string
}

// a Visitor (c.f. design patterns) which recursively visits constraints in order to create an HTML DOM representing those constraints for the side panel
export class HTMLExportVisitor implements ConstraintVisitor<ComponentRef<any>> {

    constructor(private componentFactoryResolver: ComponentFactoryResolver, private parentContainerRef: ViewContainerRef) {

    }

    private buildNewComponent<C>(componentType: Type<C>): ComponentRef<C> {
        return Utils.buildComponent(this.componentFactoryResolver, this.parentContainerRef, componentType)
    }

    // build a component which will wrap the simple text representation of the constraint.
    private buildSimpleTextComponent(c: Constraint): ComponentRef<any> {
        const componentRef = this.buildNewComponent(SimpleConceptSummaryComponent)
        componentRef.instance.textRepresentation = c.textRepresentation
        return componentRef
    }

    visitConstraint(c: Constraint): ComponentRef<any> {
        return this.buildSimpleTextComponent(c)
    }

    visitCombinationConstraint(cc: CombinationConstraint): ComponentRef<any> {
        const componentRef = this.buildNewComponent(CombinationConstraintSummaryComponent)
        const componentInstance = componentRef.instance
        componentInstance.state = cc.combinationState

        componentInstance.children = []

        componentInstance.containerRef.subscribe(containerRef => {

            // Building the children components. The containerRef element is a reference to the DOM element which contain those children components.
            cc.children.forEach((child, index) => {
                const childVisitor = new HTMLExportVisitor(this.componentFactoryResolver, containerRef)
                console.log("Before child accept method", child)
                const childRef = child.accept(childVisitor)
                componentInstance.children.push(childRef)


                if ((index + 1) === cc.children.length) {
                    return
                }
                // add an operator component after the new child. This operator component displays the OR, AND in a pretty way
                componentInstance.addOperator();
            })

        })


        return componentRef
    }

    visitConceptConstraint(c: ConceptConstraint): ComponentRef<any> {
        console.log("In visit concept constraint", c)

        var displayNames: string[] = []
        //retrieving the display name of the ancestors tree nodes
        var currentNode: TreeNode = c.treeNode
        for (;true;) {
            if (currentNode === undefined || currentNode === null){
                break;
            }
            displayNames.push(currentNode.displayName)
            console.log("current : ", currentNode.path, "  child:", c.treeNode.displayName)
            currentNode = currentNode.parent
        }

        const componentRef = this.buildNewComponent(ConceptConstraintSummaryComponent)
        const componentInstance = componentRef.instance
        componentInstance.conceptPath = displayNames.reverse()
        componentInstance.displayName = c.treeNode.displayName
        return componentRef
    }

    visitNegationConstraint(c: NegationConstraint): ComponentRef<any> {
        /* In principle this function is not visited.
         * A negation constraint is only created when we are creating the i2b2 panels and passing them to the backend.
         */
        console.warn("This is not supposed to happen")
        return c.constraint.accept(this)
    }
    visitCohortConstraint(c: CohortConstraint): ComponentRef<any> {
        return this.buildSimpleTextComponent(c)
        //TODO create a bogus cohort to test this component
    }
    visitGenomicAnnotationConstraint(c: GenomicAnnotationConstraint): ComponentRef<any> {
        return this.buildSimpleTextComponent(c)
        //TODO create a bogus genomic annotation to test this component
    }
    visitTimeConstraint(c: TimeConstraint): ComponentRef<any> {
        return this.buildSimpleTextComponent(c)
    }
    visitValueConstraint(c: ValueConstraint): ComponentRef<any> {
        return this.buildSimpleTextComponent(c)
    }

}