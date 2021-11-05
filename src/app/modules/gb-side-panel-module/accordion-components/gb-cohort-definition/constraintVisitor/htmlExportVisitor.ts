import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, Type, ViewChild, ViewContainerRef } from "@angular/core";
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

    isLastElement(index: number): boolean {
        return this.pathElements.length === (index + 1)
    }

    set conceptPath(pathElements: string[]) {
        this.pathElements = pathElements
    }
}


@Component({
    template: `
    <div>
        {{operator}}
    </div>
    `

})
export class OperatorComponent {
    operator: string

    set state(state: CombinationState) {
        switch (state) {
            case CombinationState.And:
                this.operator = 'AND'
                break;
            case CombinationState.Or:
                this.operator = 'OR'
                break;
            default:
                this.operator = 'UNKNOWN OPERATOR'
                console.error("We should not be there missing case!")
                break
        }
    }

}


@Component({
    styles: [
        '.outerDiv { margin-left: '+ulLeftPadding+'; }'
    ],
    template: `
    <div class="outerDiv">
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
export class ConceptSummaryComponent {
    textRepresentation: string
    constructor(c: Constraint) {
        this.textRepresentation = c.textRepresentation
    }
}

// a Visitor (c.f. design patterns) which recursively visits constraints in order to create an HTML DOM representing those constraints for the side panel
export class HTMLExportVisitor implements ConstraintVisitor<ComponentRef<any>> {

    constructor(private componentFactoryResolver: ComponentFactoryResolver, private parentContainerRef: ViewContainerRef) {

    }

    private buildNewComponent<C>(componentType: Type<C>): ComponentRef<C> {
        return Utils.buildComponent(this.componentFactoryResolver, this.parentContainerRef, componentType)
    }



    visitConstraint(c: Constraint): ComponentRef<any> {
        const componentRef = this.buildNewComponent(ConceptSummaryComponent)
        componentRef.instance.textRepresentation = c.textRepresentation
        console.log("In visit constraint", c)
        return componentRef
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
        componentRef.instance.conceptPath = displayNames.reverse()
        return componentRef
    }

    visitCohortConstraint(c: CohortConstraint): ComponentRef<any> {
        throw new Error("Method not implemented.");
    }
    visitGenomicAnnotationConstraint(c: GenomicAnnotationConstraint): ComponentRef<any> {
        throw new Error("Method not implemented.");
    }
    visitNegationConstraint(c: NegationConstraint): ComponentRef<any> {
        throw new Error("Method not implemented.");
    }
    visitTimeConstraint(c: TimeConstraint): ComponentRef<any> {
        throw new Error("Method not implemented.");
    }
    visitValueConstraint(c: ValueConstraint): ComponentRef<any> {
        throw new Error("Method not implemented.");
    }

}