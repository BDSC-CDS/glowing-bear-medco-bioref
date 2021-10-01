/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { AfterViewInit, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, ElementRef, OnChanges, OnInit, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
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


  constructor(private exploreStatisticsService: ExploreStatisticsService,
    private componentFactoryResolver: ComponentFactoryResolver) {

    console.debug("Subscribing to charts data emitter")

  }


  ngAfterViewInit() {
    this.exploreStatisticsService.ChatsDataSubject.subscribe((chartsInfo: ChartInformation[]) => {
      this.displayCharts(chartsInfo);
    })
  }





  private displayCharts(chartsInfo: ChartInformation[]) {
    console.debug("callback from subscription to data emitter", chartsInfo);


    // Clean the content of the canvas container: remove the previous charts from the canvas container
    //TODO remove the comment directive from the next line
    this.canvasContainer.clear()

    chartsInfo.forEach(chartInfo => {

      // create the canvas on which the chart will be drawn.
      const childComponentFactory = this.componentFactoryResolver.resolveComponentFactory(ChartComponent);
      const childComponentRef = this.canvasContainer.createComponent(childComponentFactory);


      const chart = childComponentRef.instance

      chart.componentInitialized.subscribe(_ => {
        chart.drawChart(chartInfo)
      })

      return childComponentRef
    });



    this.openStatsResultsAccordion = true;
  }
}



// TODO est-ce que ça render mal parceque j'ai oublié de spécifier l'existence de ce composant dans app.module.ts
// https://learntutorials.net/fr/angular2/topic/831/ajout-dynamique-de-composants-a-l-aide-de-viewcontainerref-createcomponent

// See for reference how to use canvas in angular:  https://stackoverflow.com/questions/44426939/how-to-use-canvas-in-angular
@Component({
  selector: 'explore-stats-canvas', //TODO maybe we should not use selector option since we might have multiple chart component on our hands. And hence multiple component would have the same name
  template: `<div [hidden]="!chart"><canvas #canvasElement>{{chart}}</canvas></div>`
})
export class ChartComponent implements AfterViewInit {
  private static BACKGROUND_COLOURS: string[] = ['rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(153, 102, 255, 0.5)',
    'rgba(255, 159, 64, 0.5)']



  chart: Chart

  context: CanvasRenderingContext2D; // not sure it is necessary to put this as an attribute of the class


  @ViewChild('canvasElement', { static: false })
  canvasRef: ElementRef<HTMLCanvasElement>;//HTMLCanvasElement

  componentInitialized: Subject<boolean> = new Subject()

  constructor(public element: ElementRef, private cdref: ChangeDetectorRef) {
    this.element.nativeElement
  }

  // the colour is chosen in BACKGROUND_COLOURS modulo the length of BACKGROUND_COLOURS
  private static getBackgroundColor(index: number): string {
    return ChartComponent.BACKGROUND_COLOURS[index % ChartComponent.BACKGROUND_COLOURS.length]
  }

  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  ngAfterViewInit(): void {
    // the reference to the `canvas` on which the chart will be drawn. See the @Component to see the canvas.
    this.context = this.canvasRef.nativeElement.getContext('2d');
    console.debug("Ng on init of ChartComponent : canvasRef", this.context)

    this.chart = new Chart(this.context, {
      type: 'bar',
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



  /*
  * Given ChartInformation object this function will draw the chart on the canvas
  */
  drawChart(chartInfo: ChartInformation) {
    const chart = this.chart

    if (!(chartInfo && chartInfo.intervals && chartInfo.intervals.length > 0)) {
      chart.data.labels = [];
      chart.data.datasets[0].data = [];

      chart.update()

      return

    }

    //When the interval is the last one the right bound is inclusive, otherwise it is exclusive.
    const getRightBound = (i: number) => i < (chartInfo.intervals.length - 1) ? '[' : ']'

    chart.data.labels = chartInfo.intervals.map((int, i) => '[ ' + int.lowerBound + ', ' + int.higherBound + ' ' + getRightBound(i));
    chart.data.datasets[0] = {
      data: chartInfo.intervals.map(i => i.count),
      backgroundColor: chartInfo.intervals.map((_, index) => ChartComponent.getBackgroundColor(index))
    }

    let min, max: number
    max = chartInfo.intervals[0].count
    min = max

    chart.options = {
      legend: {
        display: false
      },
      title: {
        text: 'Histogram for the `' + chartInfo.treeNodeName + '` concept in the context of the `' + chartInfo.cohortName + '` cohort ',
        display: true
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: chartInfo.unit,
          }
        }]
      }
    }

    chartInfo.intervals.forEach(v => {
      if (max < v.count) {
        max = v.count
      }
      if (min > v.count) {
        min = v.count
      }
    })

    // the minimum value displayed by the chart is defined as the minimum data point minus 10% the range of values (max - min)
    const minDisplayed = min - (max - min) * .1
    chart.options.scales.yAxes = [{
      ticks: {
        min: minDisplayed
      }
    }]

    chart.update();
  }

}