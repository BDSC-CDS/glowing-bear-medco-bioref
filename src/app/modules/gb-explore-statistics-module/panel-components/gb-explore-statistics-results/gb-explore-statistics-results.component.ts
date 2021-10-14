/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ElementRef, ViewChild, ViewContainerRef } from '@angular/core';
import Chart from 'chart.js';
import { Subject } from 'rxjs';
import { ChartInformation, ExploreStatisticsService } from '../../../../services/explore-statistics.service';

@Component({
  selector: 'gb-explore-statistics-results',
  templateUrl: './gb-explore-statistics-results.component.html',
  styleUrls: ['./gb-explore-statistics-results.component.css'],
})
export class GbExploreStatisticsResultsComponent implements AfterViewInit {

  @ViewChild('exploreStatsCanvasContainer', { read: ViewContainerRef }) canvasContainer: ViewContainerRef;


  openStatsResultsAccordion = false

  displayLoadingIcon = false


  constructor(private exploreStatisticsService: ExploreStatisticsService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private cdref: ChangeDetectorRef) {


  }


  ngAfterViewInit() {
    this.exploreStatisticsService.chartsDataSubject.subscribe((chartsInfo: ChartInformation[]) => {
      this.displayCharts(chartsInfo);
    })

    this.exploreStatisticsService.displayLoadingIcon.subscribe((display: boolean) => {
      this.displayLoadingIcon = display
    })
  }


  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }


  private displayCharts(chartsInfo: ChartInformation[]) {


    // Clean the content of the canvas container: remove the previous charts from the canvas container
    this.canvasContainer.clear()

    chartsInfo.forEach(chartInfo => {

      // Create a histogram based on the chart info
      this.buildChart('bar', (chartComponent: ChartComponent) => chartComponent.drawHistogram(chartInfo));

      // Create a plot with interpolated lines
      this.buildChart('line', (chartComponent: ChartComponent) => chartComponent.drawInterpolatedLine(chartInfo))

    });



    this.openStatsResultsAccordion = true;
  }


  /*
  * This method acts as a factory to dynamically build the graph (histogram, line plot, ...).
  * It takes as parameters the method from the ChartComponent which will be used to draw the graph.
  * */
  private buildChart(chartType: string, drawMethod: (ChartComponent) => void): void {
    const childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(ChartComponent);
    const childComponentRef = this.canvasContainer.createComponent(childComponentFactory);


    const chart = childComponentRef.instance;
    chart.chartType = chartType

    chart.componentInitialized.subscribe(_ => drawMethod(chart));
  }

}



// See for reference how to use canvas in angular:  https://stackoverflow.com/questions/44426939/how-to-use-canvas-in-angular
@Component({
  selector: 'gb-explore-stats-canvas',
  template: `<div [hidden]="!chart"><canvas #canvasElement>{{chart}}</canvas></div>`
})
export class ChartComponent implements AfterViewInit {
  private static BACKGROUND_COLOURS: string[] = [
    'rgba(68, 0, 203, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 99, 132, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(255, 159, 64, 0.5)']



  chart: Chart

  chartType: string

  context: CanvasRenderingContext2D; // not sure it is necessary to put this as an attribute of the class


  @ViewChild('canvasElement', { static: false })
  canvasRef: ElementRef<HTMLCanvasElement>;

  componentInitialized: Subject<boolean> = new Subject()

  // the colour is chosen in BACKGROUND_COLOURS modulo the length of BACKGROUND_COLOURS
  private static getBackgroundColor(index: number): string {
    return ChartComponent.BACKGROUND_COLOURS[index % ChartComponent.BACKGROUND_COLOURS.length]
  }

  constructor(public element: ElementRef, private cdref: ChangeDetectorRef) {

  }


  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  ngAfterViewInit(): void {
    // the reference to the `canvas` on which the chart will be drawn. See the @Component to see the canvas.
    this.context = this.canvasRef.nativeElement.getContext('2d');

    this.chart = new Chart(this.context, {
      type: this.chartType,
      data: {
        labels: [],
        datasets: [{
          data: []
        }]
      },
      options: {
        scales: {
          yAxes: [{
            ticks: {
              min: 0
            }
          }]
        }
      }
    })

    this.componentInitialized.next(true)
  }


  //this method process the dataset necessary for drawing the interpolated line graph
  private buildPoints(chartInfo: ChartInformation): Object {
    // the x axis point associated to an interval count will be the the middle between the higher and lower bound of an interval
    const xPoints: Array<number> = chartInfo.intervals.map(interval => {
      return (parseFloat(interval.higherBound) + parseFloat(interval.lowerBound)) / 2
    })

    const dataPoints: Array<number> = chartInfo.intervals.map(interval => interval.count)


    return {
      labels: xPoints,
      datasets: [
        {
          label: 'Interpolated line plot for the `' + chartInfo.treeNodeName + '` analyte', //'Cubic interpolation (monotone)',
          data: dataPoints,
          borderColor: ChartComponent.BACKGROUND_COLOURS[0],
          fill: false,
          cubicInterpolationMode: 'monotone',
          tension: 0.4
        },
        // {
        //   label: 'Cubic interpolation',
        //   data: dataPoints,
        //   borderColor: ChartComponent.BACKGROUND_COLOURS[1],
        //   fill: false,
        //   tension: 0.4
        // },
        // {
        //   label: 'Linear interpolation (default)',
        //   data: dataPoints,
        //   borderColor: ChartComponent.BACKGROUND_COLOURS[2],
        //   fill: false
        // }
      ]
    };
  }

  // this method builds the config necessary for drawing the interpolated line graph
  private buildConfig(chartInfo: ChartInformation, data: Object): Object {
    return {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Interpolated line plot for the `' + chartInfo.treeNodeName + '` analyte',
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Value [' + chartInfo.unit + ']',
            }
          }],
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Frequency',
            }
          }],
          x: {
            display: true,
            title: {
              display: true,
            }
          },
          y: {
            display: true,
            title: {
              display: true,
            },
            suggestedMin: -10,
          }
        }
      },
    };
  }

  /*
  * Given ChartInformation object this function will a line graph on the canvas. The points of the curves are interconnected using interpolation methods
  * see for reference https://github.com/chartjs/Chart.js/blob/master/docs/samples/line/interpolation.md
  */
  drawInterpolatedLine(chartInfo: ChartInformation) {
    const chart = this.chart

    if (!(chartInfo && chartInfo.intervals && chartInfo.intervals.length > 0)) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];

      chart.update()

      return

    }


    const data = this.buildPoints(chartInfo)

    const config = this.buildConfig(chartInfo, data)

    chart.config = config
    chart.data = data

    chart.update()
  }

  /*
  * Given ChartInformation object this function will draw the histogram on the canvas
  */
  drawHistogram(chartInfo: ChartInformation) {
    const chart = this.chart

    if (!(chartInfo && chartInfo.intervals && chartInfo.intervals.length > 0)) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];

      chart.update()

      return

    }

    // When the interval is the last one the right bound is inclusive, otherwise it is exclusive.
    const getRightBound = (i: number) => i < (chartInfo.intervals.length - 1) ? '[' : ']'

    chart.data.labels = chartInfo.intervals.map((int, i) => {
      return '[ ' + parseFloat(int.lowerBound) + ', ' + parseFloat(int.higherBound) + ' ' + getRightBound(i)
    });
    chart.data.datasets[0] = {
      data: chartInfo.intervals.map(i => i.count),
      backgroundColor: ChartComponent.getBackgroundColor(0) //chartInfo.intervals.map(_ => ChartComponent.getBackgroundColor(0))
    }


    chart.options = this.buildHistogramOptions(chartInfo)

    const minDisplayed = this.findMinDisplayed(chartInfo);
    chart.options.scales.yAxes = [{
      ticks: {
        min: minDisplayed
      }
    }]

    chart.update();
  }


  private findMinDisplayed(chartInfo: ChartInformation) {
    let min, max: number;
    max = chartInfo.intervals[0].count;
    min = max;

    chartInfo.intervals.forEach(v => {
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

  private buildHistogramOptions(chartInfo: ChartInformation): Chart.ChartOptions {
    return {
      legend: {
        display: false
      },
      title: {
        text: 'Histogram for the `' + chartInfo.treeNodeName + '` analyte',
        display: true
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Value [' + chartInfo.unit + ']',
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: 'Frequency',
          }
        }]
      }
    };
  }
}
