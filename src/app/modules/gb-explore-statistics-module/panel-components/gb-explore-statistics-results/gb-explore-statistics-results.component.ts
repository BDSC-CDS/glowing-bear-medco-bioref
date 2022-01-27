/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TreeNode } from 'src/app/models/tree-models/tree-node';
import { ChartInformation, ConfidenceInterval, ExploreStatisticsService } from '../../../../services/explore-statistics.service';
import { ChartComponent, HistogramChartComponent, LineChartComponent } from './gb-chart.component';
import { PDF } from 'src/app/utilities/files/pdf';
import { ErrorHelper } from 'src/app/utilities/error-helper';
import { Subscription } from 'rxjs';

const childFlexCss = './child-flex.css'
const resultsCss = './gb-explore-statistics-results.component.css'
const refIntervalCss = './gb-reference-interval.component.css'


export interface SVGConvertible {
  /*
  * print the current component to the pdf passed as parameter. Index is the index of the component in the parent component.
  * isLastInRow defines if the svg printed to the pdf is the last element of the current row in the pdf. If the element is the last in
  * the row some vertical margin will be appended after the element.
  **/
  printToPDF(pdf: PDF, index: number, isLastInRow: boolean): any
}

@Component({
  selector: 'gb-explore-statistics-results',
  templateUrl: './gb-explore-statistics-results.component.html',
  styleUrls: [resultsCss],
})
export class GbExploreStatisticsResultsComponent implements AfterViewInit, OnDestroy {

  @ViewChild('exploreStatsCanvasContainer', { read: ViewContainerRef })
  canvasContainer: ViewContainerRef;

  private componentRefs: Array<ComponentRef<any>> = []

  private _displayLoadingIcon: boolean = false

  private exportPDFSubscription: Subscription

  //instantiated reference interval components visible within the view of the GbExploreStatisticsResultsComponent
  private refIntervalsComponents: ReferenceInterval[]

  constructor(private exploreStatisticsService: ExploreStatisticsService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdref: ChangeDetectorRef) {


    this.exportPDFSubscription = this.exploreStatisticsService.exportPDF.subscribe(_ => {
      const pdf = new PDF()
      if (this.refIntervalsComponents === undefined || this.refIntervalsComponents.length <= 0) {
        throw ErrorHelper.handleNewError("Cannot export pdf yet. Execute a query firsthand.")
      }
      this.refIntervalsComponents.forEach((c, i) => c.toPDF(pdf, i))
      pdf.export("testDoc.pdf")
    })

  }



  private displayCharts(chartsInfo: ChartInformation[]) {


    // Clean the content of the canvas container: remove the previous charts from the canvas container
    this.canvasContainer.clear()

    this.refIntervalsComponents = chartsInfo.map(chartInfo => {

      // //create a histogram
      // this.buildChart(chartInfo, HistogramChartComponent)

      // // create a smooth line graph
      // this.buildChart(chartInfo, LineChartComponent)

      // this.buildReferenceInterval(chartInfo, ReferenceIntervalHistogram)
      return this.buildReferenceInterval(chartInfo, ReferenceIntervalLine)

    });

  }


  private buildReferenceInterval<R extends ReferenceInterval>(chartInfo: ChartInformation, refIntervalType: Type<R>): R {
    const componentRef = Utils.buildComponent(this.componentFactoryResolver, this.canvasContainer, refIntervalType)
    this.componentRefs.push(componentRef)

    const component = componentRef.instance
    component.chartInfo = chartInfo

    return component
  }

  get displayLoadingIcon() {
    return this._displayLoadingIcon
  }

  ngOnInit() {
    Chart.register(annotationPlugin);
    Chart.register(...registerables) // for the x and y scales options in the config of chart js

    this.exploreStatisticsService.displayLoadingIcon.subscribe((display: boolean) => {
      this._displayLoadingIcon = display
      this.cdref.detectChanges();
    })
  }

  ngAfterViewInit() {
    this.exploreStatisticsService.chartsDataSubject.subscribe((chartsInfo: ChartInformation[]) => {
      this.displayCharts(chartsInfo);
    })
  }

  ngOnDestroy() {
    if (this.exportPDFSubscription !== undefined && this.exportPDFSubscription !== null) {
      this.exportPDFSubscription.unsubscribe()
    }
    this.componentRefs.forEach(element => {
      element.destroy()
    });
  }

}

export class Utils {
  public static buildComponent<C>(componentFactoryResolver: ComponentFactoryResolver, newComponentContainer: ViewContainerRef, componentType: Type<C>): ComponentRef<C> {
    const componentFactory = componentFactoryResolver.resolveComponentFactory(componentType);
    return newComponentContainer.createComponent(componentFactory);
  }


  public static buildChart<C extends ChartComponent>(componentFactoryResolver: ComponentFactoryResolver, newComponentContainer: ViewContainerRef,
    chartInfo: ChartInformation, componentType: Type<C>): ComponentRef<C> {
    const componentRef = Utils.buildComponent(componentFactoryResolver, newComponentContainer, componentType)

    const component = componentRef.instance
    component.chartInfo = chartInfo

    return componentRef
  }

  //retrieving the display name of the ancestors tree nodes and assemble those display name in a list
  static extractDisplayablePath(treeNode: TreeNode) {
    let currentNode: TreeNode = treeNode
    let displayNames: string[] = []
    for (; true;) {
      if (currentNode === undefined || currentNode === null) {
        break;
      }
      displayNames.push(currentNode.displayName)
      currentNode = currentNode.parent
    }

    return displayNames.reverse()
  }

}


const referenceIntervalTemplate = './gb-reference-interval.component.html';
@Component({
  templateUrl: referenceIntervalTemplate,
  styleUrls: [refIntervalCss, resultsCss, childFlexCss],
  host: {
    "[class.hidden]": "hide" //https://stackoverflow.com/questions/61965535/apply-css-class-conditionally-to-angular-component-host
  }
})
export abstract class ReferenceInterval implements OnDestroy {

  @ViewChild('chartContainer', { read: ViewContainerRef }) chartContainer: ViewContainerRef;


  @Input()
  middleCI1: number
  @Input()
  lowBoundCI1: number
  @Input()
  highBoundCI1: number

  @Input()
  middleCI2: number
  @Input()
  lowBoundCI2: number
  @Input()
  highBoundCI2: number

  @Input()
  CI2: ConfidenceInterval

  private _chartInfo: ChartInformation

  private componentRefs: Array<ComponentRef<ChartComponent>> = []

  protected chartType: Type<ChartComponent>;

  @Input() hide: boolean = false

  private chartBuilt: boolean = false

  public static readonly PDF_COMPONENTS_PER_ROW = 2.0

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {

  }

  private buildChart<C extends ChartComponent>(chartInfo: ChartInformation, componentType: Type<C>) {
    const componentRef = Utils.buildChart(this.componentFactoryResolver, this.chartContainer, chartInfo, componentType)
    this.componentRefs.push(componentRef)
    const CI1 = chartInfo.CI1
    const CI2 = chartInfo.CI2

    this.middleCI1 = CI1.middle
    this.lowBoundCI1 = CI1.lowerBound
    this.highBoundCI1 = CI1.higherBound

    this.middleCI2 = CI2.middle
    this.lowBoundCI2 = CI2.lowerBound
    this.highBoundCI2 = CI2.higherBound
  }


  //print the current component to the pdf passed as parameter. Index is the index of the component in the parent component
  toPDF(pdf: PDF, index: number) {
    if (!this.chartBuilt) {
      return
    }
    if (this.componentRefs === undefined || this.componentRefs.length <= 0) {
      throw ErrorHelper.handleNewError("Cannot export pdf yet. Execute a query firsthand.")
    }


    const columnIndex = (index: number) => index % ReferenceInterval.PDF_COMPONENTS_PER_ROW
    const isLastInRow = (index: number) => columnIndex(index) === (this.componentRefs.length - 1)

    this.componentRefs.forEach((c, i) => c.instance.printToPDF(pdf, index, isLastInRow(i)))

  }

  ngAfterViewInit() {
    this.buildChart(this._chartInfo, this.chartType)
    this.chartBuilt = true
  }


  remove() {
    this.hide = true
  }

  ngOnDestroy(): void {
    this.componentRefs.forEach(component => component.destroy())
  }

  numberOfObservations() {
    return this._chartInfo.numberOfObservations()
  }

  public set chartInfo(chartInfo: ChartInformation) {
    this._chartInfo = chartInfo
  }

}

@Component({
  templateUrl: referenceIntervalTemplate,
  styleUrls: [refIntervalCss, resultsCss, childFlexCss],
})
export class ReferenceIntervalLine extends ReferenceInterval {
  constructor(componentFactoryResolver: ComponentFactoryResolver) {
    super(componentFactoryResolver)
    this.chartType = LineChartComponent
  }
}

@Component({
  templateUrl: referenceIntervalTemplate,
  styleUrls: [refIntervalCss, resultsCss, childFlexCss],
})
export class ReferenceIntervalHistogram extends ReferenceInterval {
  constructor(componentFactoryResolver: ComponentFactoryResolver) {
    super(componentFactoryResolver)
    this.chartType = HistogramChartComponent
  }
}


