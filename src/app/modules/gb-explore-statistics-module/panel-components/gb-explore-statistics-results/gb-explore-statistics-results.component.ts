/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, ElementRef, OnDestroy, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, ChartOptions, ChartType, registerables, ScriptableLineSegmentContext } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { PDF } from 'src/app/utilities/files/pdf';
import { ChartInformation, ExploreStatisticsService } from '../../../../services/explore-statistics.service';

const childFlexCss = './child-flex.css'
const resultsCss = './gb-explore-statistics-results.component.css'
const refIntervalCss = './gb-reference-interval.component.css'


interface SVGConvertible {
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

      //create a histogram
      this.buildChart(chartInfo, HistogramChartComponent)

      // create a smooth line graph
      this.buildChart(chartInfo, LineChartComponent)

      this.buildReferenceInterval(chartInfo, ReferenceIntervalHistogram)
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

class Utils {
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

  private componentRefs: Array<ComponentRef<any>> = []

  protected chartType: Type<ChartComponent>;


  constructor(private componentFactoryResolver: ComponentFactoryResolver) {
    this._nbEntries = 1
    this._lowQuantile = 2
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



const chartSelector = 'gb-explore-stats-canvas'
const chartTemplate = `
  <div>
    <canvas #canvasElement>{{chart}}</canvas>
  </div>
  `


// See for reference how to use canvas in angular:  https://stackoverflow.com/questions/44426939/how-to-use-canvas-in-angular
export abstract class ChartComponent implements AfterViewInit, OnDestroy, SVGConvertible {
  private static BACKGROUND_COLOURS: string[] = [
    'rgba(68, 0, 203, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 99, 132, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(255, 159, 64, 0.5)']


  @ViewChild('canvasElement', { static: false })
  private canvasRef: ElementRef<HTMLCanvasElement>;

  protected chartJSType: ChartType

  chartInfo: ChartInformation

  chart: Chart


  // the colour is chosen in BACKGROUND_COLOURS modulo the length of BACKGROUND_COLOURS
  static getBackgroundColor(index: number): string {
    return ChartComponent.BACKGROUND_COLOURS[index % ChartComponent.BACKGROUND_COLOURS.length]
  }

  constructor(public element: ElementRef, chartJSType: ChartType) {
    this.chartJSType = chartJSType
  }

  toPDF() {
    console.log("Exporting chart to PDF")
    const pdf = new PDF()
    const exportedChart = this.canvasRef.nativeElement.toDataURL('image/svg', 'high')
    const height = this.canvasRef.nativeElement.height
    const width = this.canvasRef.nativeElement.width

    const ratio = height / width

    const pdfWidth = pdf.getWidth()
    const imgHeight = ratio * pdfWidth

    pdf.addImageFromDataURL(exportedChart, 0, 0, pdfWidth, imgHeight)
    pdf.export("chartTest.pdf")

  }


  ngAfterViewInit(): void {

    //TODO debug: ExpressionChangedAfterItHasBeenCheckedError (maybe use angular chart js?)
    // the reference to the `canvas` on which the chart will be drawn. See the @Component to see the canvas.
    const context = this.canvasRef.nativeElement.getContext('2d');

    this.chart = this.draw(context)
    this.chart.update()
  }

  abstract draw(context: CanvasRenderingContext2D);

  ngOnDestroy() {
  }


}

@Component({
  selector: chartSelector,
  template: chartTemplate,
  styleUrls: [resultsCss, childFlexCss],
})
export class HistogramChartComponent extends ChartComponent {


  constructor(public element: ElementRef) {
    super(element, 'bar')
  }

  ngAfterViewInit() {
    super.ngAfterViewInit()
  }

  /*
  * Given ChartInformation object this function will draw the histogram on the canvas
  */
  draw(context: CanvasRenderingContext2D): Chart {

    if (!(this.chartInfo && this.chartInfo.intervals && this.chartInfo.intervals.length > 0)) {

      return new Chart(context,
        {
          type: this.chartJSType,
          data: {
            datasets: []
          }
        }
      )

    }

    // When the interval is the last one the right bound is inclusive, otherwise it is exclusive.
    const getRightBound = (i: number) => i < (this.chartInfo.intervals.length - 1) ? '[' : ']'

    const labels = this.chartInfo.intervals.map((int, i) => {
      return '[ ' + parseFloat(int.lowerBound) + ', ' + parseFloat(int.higherBound) + ' ' + getRightBound(i)
    })
    const data = {
      labels,
      datasets: [{
        data: this.chartInfo.intervals.map(i => i.count),
        backgroundColor: ChartComponent.getBackgroundColor(0) //this.chartInfo.intervals.map(_ => ChartComponent.getBackgroundColor(0))
      }]
    }



    return new Chart(context,
      {
        type: this.chartJSType,
        data,
        options: this.buildHistogramOptions(),
      }
    );


  }


  private findMinDisplayed() {
    let min, max: number;
    max = this.chartInfo.intervals[0].count;
    min = max;

    this.chartInfo.intervals.forEach(v => {
      if (max < v.count) {
        max = v.count;
      }
      if (min > v.count) {
        min = v.count;
      }
    });

    // the minimum value displayed by the chart is defined as the minimum data point minus 10% the range of values (max - min)
    const minDisplayed = min === 0 ? 0 : Math.floor(min - (max - min) * .1);
    return minDisplayed;
  }

  private buildHistogramOptions(): ChartOptions {


    return {
      plugins: {
        title: {
          text: 'Histogram for the `' + this.chartInfo.treeNodeName + '` analyte',
          display: true
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Value [' + this.chartInfo.unit + ']'
          },
        },
        y: {
          title: {
            display: true,
            text: 'Frequency'
          },
          suggestedMin: this.findMinDisplayed()
        }
      }
    };
  }
}

@Component({
  selector: chartSelector,
  template: chartTemplate,
  styleUrls: [resultsCss, childFlexCss],
})
export class LineChartComponent extends ChartComponent {
  constructor(public element: ElementRef) {
    super(element, 'line')
  }

  ngAfterViewInit() {
    super.ngAfterViewInit()
  }

  // buildPoints  processes the dataset necessary for drawing the interpolated line graph
  private buildPoints(chartInfo: ChartInformation): ChartData {
    // the x axis points associated to an interval count will be the the middle between the higher and lower bound of an interval
    const xValues: Array<number> = chartInfo.intervals.map(interval => {
      return (parseFloat(interval.higherBound) + parseFloat(interval.lowerBound)) / 2
    })

    const yValues: Array<number> = chartInfo.intervals.map(interval => interval.count)


    //TODO replace those hardcoded values
    const confInterval1Low = 1
    const confInterval1High = 2

    const confInterval2Low = 4
    const confInterval2High = 5

    const segmentColour = (ctx: ScriptableLineSegmentContext) => {
      //the index of the current data point
      const currentIndex = ctx.p0DataIndex
      // is the index of the current point within the first confidence interval or the second confidence interval
      const isConfidenceInterval = (currentIndex >= confInterval1Low && currentIndex <= confInterval1High) || (currentIndex >= confInterval2Low && currentIndex <= confInterval2High)
      if (isConfidenceInterval) {
        return 'red'
      }

      return 'black'
    }


    return {
      labels: xValues,
      datasets: [
        {
          label: 'interpolated',
          data: yValues,
          borderColor: ChartComponent.getBackgroundColor(0),
          fill: {
            target: 1,
            above: 'rgb(255, 0, 0)' //colour of the fill above the origin
          },
          cubicInterpolationMode: 'monotone',
          segment: {
            borderColor: segmentColour
          }
        },
        {
          label: 'histogram',
          data: yValues,
          type: 'bar'
        }
        // getDatasetSlice(false, 0, 2),
        // getDatasetSlice('+1', 1, 4),
        // getDatasetSlice(false, 3)
      ]
    };
  }

  // this method builds the config necessary for drawing the interpolated line graph
  private buildConfig(data: ChartData): ChartConfiguration {



    return {
      type: this.chartJSType,
      data: data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Interpolated line plot for the `' + this.chartInfo.treeNodeName + '` analyte',
          },
          legend: {
            display: true,
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Value [' + this.chartInfo.unit + ']',
            }
          },
          y: {
            title: {
              display: true,
              text: 'Frequency',
            }
          },
        }
      },
    };
  }

  /*
  * Given ChartInformation object this function will a line graph on the canvas. The points of the curves are interconnected using interpolation methods
  * see for reference https://github.com/chartjs/Chart.js/blob/master/docs/samples/line/interpolation.md
  */
  draw(context: CanvasRenderingContext2D): Chart {
    const chartInfoAvailable = this.chartInfo && this.chartInfo.intervals && this.chartInfo.intervals.length > 0
    if (!chartInfoAvailable) {
      const data = {
        datasets: []
      }
      return new Chart(context, { type: this.chartJSType, data, })

    }


    const data = this.buildPoints(this.chartInfo)


    const config = this.buildConfig(data) as any

    const refIntervalX1 = data.labels[1]
    config.options.plugins.annotation = {
      annotations: {
        line1: { //vertical line denoting the 2.5 percentile
          type: 'line',
          xMin: refIntervalX1,
          xMax: refIntervalX1,
          borderColor: 'black',
          borderDash: [5, 15],
          label: {
            content: "2.5%",
            enabled: true,
            rotation: 90, //rotation in degrees
            xAdjust: 10,
            backgroundColor: 'rgba(0,0,0,0)',
            color: 'black'
          }
        }
      }
    };




    return new Chart(context, config,)

  }
}