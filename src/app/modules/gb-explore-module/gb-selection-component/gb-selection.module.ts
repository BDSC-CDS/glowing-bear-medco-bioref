import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccordionModule, AutoCompleteModule, CalendarModule, CheckboxModule, DropdownModule, InputNumberModule, MultiSelectModule, PanelModule, TooltipModule } from 'primeng';
import { GbUtilsModule } from '../../gb-utils-module/gb-utils.module';
import { GbCohortConstraintComponent } from '../constraint-components/gb-cohort-constraint/gb-cohort-constraint.component';
import { GbCombinationConstraintComponent } from '../constraint-components/gb-combination-constraint/gb-combination-constraint.component';
import { GbConceptConstraintComponent } from '../constraint-components/gb-concept-constraint/gb-concept-constraint.component';
import { GbTooltipComponent } from '../constraint-components/gb-concept-constraint/gb-tooltip/gb-tooltip.component';
import { GbConstraintComponent } from '../constraint-components/gb-constraint/gb-constraint.component';
import { GbGenomicAnnotationConstraintComponent } from '../constraint-components/gb-genomic-annotation-constraint/gb-genomic-annotation-constraint.component';
import { GbSelectionComponent } from './gb-selection.component';



@NgModule({
  declarations: [
    GbCombinationConstraintComponent,
    GbConstraintComponent,
    GbConceptConstraintComponent,
    GbTooltipComponent,
    GbCohortConstraintComponent,
    GbGenomicAnnotationConstraintComponent,
    GbSelectionComponent
  ],
  imports: [
    CommonModule,
    AccordionModule,
    FormsModule,
    InputNumberModule,
    AutoCompleteModule,
    CheckboxModule,
    CalendarModule,
    DropdownModule,
    PanelModule,
    MultiSelectModule,
    TooltipModule,
    GbUtilsModule
  ],
  exports: [
    GbCombinationConstraintComponent,
    GbConstraintComponent,
    GbConceptConstraintComponent,
    GbTooltipComponent,
    GbCohortConstraintComponent,
    GbGenomicAnnotationConstraintComponent,
    GbSelectionComponent
  ]
})
export class GbSelectionModule { }
