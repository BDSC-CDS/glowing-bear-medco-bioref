import { AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, TemplateRef, Type, ViewChild, ViewContainerRef } from "@angular/core";
import { utils } from "elliptic";
import { forkJoin, Observable, Subject } from "rxjs";
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



@Component({
    template: `
    <ng-template #templateRef>
        <div>
            <span *ngFor="let elem of pathElements">
                {{elem}}
            </span>
        </div>
        <div>
            applied path: {{appliedPath}}
        </div>
    </ng-template>
    `
})
class ConceptConstraintSummaryComponent {
    @Input()
    pathElements: string[]
    @Input()
    appliedPath: string

    set conceptPath(conceptPath: string) {
        const { pathElements, realAppliedPath } = TreeNode.splitTreeNodePath(conceptPath, '')
        this.pathElements = pathElements
        this.appliedPath = realAppliedPath
    }
}


//TODO trouver un truc pour que quand tu insères un nouvel enfant dynamiquement l'opérateur soit également ajouté ensuite
@Component({
    template: `
    <ng-template #templateRef>
        <div>
            <template #childrenContainer>
            </template>
        </div>
        <div>
            {{operator}}
        </div>
    </ng-template>
    `
})
class CombinationConstraintSummaryComponent implements OnDestroy, AfterViewInit {

    children: ComponentRef<any>[]

    operator: string

    @ViewChild('childrenContainer', { read: ViewContainerRef }) //TODO test if can set this field as private
    childrenContainer: ViewContainerRef;

    private containerRefSubject: Subject<ViewContainerRef>  = new Subject()

    set state(state: CombinationState) {
        switch (state) {
            case CombinationState.And:
                this.operator = 'AND'
                break;
            case CombinationState.Or:
                this.operator = 'OR'
                break;
            default:
                console.error("We should not be there missing case!")
                break
        }
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
    <ng-template #templateRef>
        <div>{{textRepresentation}}</div>
    </ng-template>
`})
class ConceptSummaryComponent  {
    @Input()
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

        // trouver le view container ref qui fait référence au combination constraint et le passer à buildNewComponent

        componentInstance.containerRef.subscribe(containerRef => {

            console.log("TODO REMOVE: Constraint container ref", containerRef)
            // Building the children components. The containerRef element is a reference to the DOM element which contain those children components.
            const childrenComponents: ComponentRef<any>[] = cc.children.map(child => {
                const childVisitor = new HTMLExportVisitor(this.componentFactoryResolver, containerRef)
                console.log("Before child accept method", child)
                return child.accept(childVisitor)
            })

            componentInstance.children = childrenComponents
        })


        return componentRef
    }

    visitConceptConstraint(c: ConceptConstraint): ComponentRef<any> {
        const componentRef = this.buildNewComponent(ConceptConstraintSummaryComponent)
        componentRef.instance.conceptPath = c.concept.path
        console.log("In visit concept constraint", c)
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