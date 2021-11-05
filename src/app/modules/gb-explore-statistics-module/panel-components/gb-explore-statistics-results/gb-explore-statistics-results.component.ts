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
import { ChartInformation, ExploreStatisticsService } from '../../../../services/explore-statistics.service';
import { ChartComponent, HistogramChartComponent, LineChartComponent } from './gb-chart.component';

const childFlexCss = './child-flex.css'
const resultsCss = './gb-explore-statistics-results.component.css'
const refIntervalCss = './gb-reference-interval.component.css'


export interface SVGConvertible {
  toPDF(): any
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


  constructor(private exploreStatisticsService: ExploreStatisticsService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdref: ChangeDetectorRef) {

    }



  private displayCharts(chartsInfo: ChartInformation[]) {


    // Clean the content of the canvas container: remove the previous charts from the canvas container
    this.canvasContainer.clear()

    chartsInfo.forEach(chartInfo => {

      // //create a histogram
      // this.buildChart(chartInfo, HistogramChartComponent)

      // // create a smooth line graph
      // this.buildChart(chartInfo, LineChartComponent)

      // this.buildReferenceInterval(chartInfo, ReferenceIntervalHistogram)
      this.buildReferenceInterval(chartInfo, ReferenceIntervalLine)

    });

  }


  private buildChart<C extends ChartComponent>(chartInfo: ChartInformation, componentType: Type<C>) {
    const componentRef = Utils.buildChart(this.componentFactoryResolver, this.canvasContainer, chartInfo, componentType)

    this.componentRefs.push(componentRef)


    this.exploreStatisticsService.exportAsPDF.subscribe(_ => {
      componentRef.instance.toPDF()
    })
  }


  private buildReferenceInterval<R extends ReferenceInterval>(chartInfo: ChartInformation, refIntervalType: Type<R>) {
    const componentRef = Utils.buildComponent(this.componentFactoryResolver, this.canvasContainer, refIntervalType)
    this.componentRefs.push(componentRef)

    const component = componentRef.instance
    component.chartInfo = chartInfo

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

  private _nbEntries: number
  private _lowQuantile: number
  private _lowBoundCI1: number
  private _highBoundCI1: number
  private _highQuantile: number
  private _lowBoundCI2: number
  private _highBoundCI2: number

  private _chartInfo: ChartInformation

  private componentRefs: Array<ComponentRef<ChartComponent>> = []

  protected chartType: Type<ChartComponent>;

  @Input() hide: boolean = false

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
    this._nbEntries = 1
    this._lowQuantile = 2 //TODO use this?
    this._lowBoundCI1 = 3
    this._highBoundCI1 = 4
    this._highQuantile = 5
    this._lowBoundCI2 = 6
    this._highBoundCI2 = 7
  }



  private buildChart<C extends ChartComponent>(chartInfo: ChartInformation, componentType: Type<C>) {
    const componentRef = Utils.buildChart(this.componentFactoryResolver, this.chartContainer, chartInfo, componentType)
    this.componentRefs.push(componentRef)
  }

  ngAfterViewInit() {
    this.buildChart(this._chartInfo, this.chartType)
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

  get nbEntries(): number { return this._nbEntries; }
  get lowQuantile(): number { return this._lowQuantile; }
  get lowBoundCI1(): number { return this._lowBoundCI1; }
  get highBoundCI1(): number { return this._highBoundCI1; }
  get highQuantile(): number { return this._highQuantile; }
  get lowBoundCI2(): number { return this._lowBoundCI2; }
  get highBoundCI2(): number { return this._highBoundCI2; }

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


