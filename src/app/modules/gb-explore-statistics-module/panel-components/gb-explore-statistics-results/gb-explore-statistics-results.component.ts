/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { Component, ElementRef, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import Chart from 'chart.js';
import { ChartInformation, ExploreStatisticsService } from '../../../../services/explore-statistics.service';

@Component({
  selector: 'gb-explore-statistics-results',
  templateUrl: './gb-explore-statistics-results.component.html',
  styleUrls: ['./gb-explore-statistics-results.component.css'],
})

export class GbExploreStatisticsResultsComponent implements OnInit, OnChanges {

  private static BACKGROUND_COLOURS: string[] = ['rgba(255, 99, 132, 0.5)',
  'rgba(54, 162, 235, 0.5)',
  'rgba(255, 206, 86, 0.5)',
  'rgba(75, 192, 192, 0.5)',
  'rgba(153, 102, 255, 0.5)',
  'rgba(255, 159, 64, 0.5)']

  @ViewChild('exploreStatsCanvasContainer') canvasContainer: ElementRef;


  chartInfoReceivedAtLeastOnce = false

  // the colour is chosen in BACKGROUND_COLOURS modulo the length of BACKGROUND_COLOURS
  private static getBackgroundColor(index: number): string {
    return GbExploreStatisticsResultsComponent.BACKGROUND_COLOURS[index % GbExploreStatisticsResultsComponent.BACKGROUND_COLOURS.length]
  }


  constructor(private exploreStatisticsService: ExploreStatisticsService) {

    console.debug("Subscribing to charts data emitter")

    this.exploreStatisticsService.ChatsDataSubject.subscribe((chartsInfo: ChartInformation[]) => {
      this.displayCharts(chartsInfo);
    })

  }

  ngOnChanges(changes: SimpleChanges): void {
  }


  ngOnInit(): void {
  }




  private displayCharts(chartsInfo: ChartInformation[]) {
    console.debug("callback from subscription to data emitter", chartsInfo);

    const canvasContainerElement = this.canvasContainer.nativeElement
    canvasContainerElement.childNodes.forEach(child => {
      canvasContainerElement.removeChild(child)
    });

    chartsInfo.forEach(chartInfo => {

      console.debug(chartInfo.intervals);

      // create the canvas on which the chart will be drawn.
      const canvas = document.createElement('canvas');

      // append the canvas to the div within the result accordion.
      canvasContainerElement.appendChild(canvas)

      const newChart = this.newChart(canvas);
      this.appendChart(chartInfo, newChart);


      return canvas;
    });



    this.chartInfoReceivedAtLeastOnce = true;
  }

  /*
  * Given ChartInformation object this function will append the chart to the list containing all charts
  */
  private appendChart(chartInfo: ChartInformation, chart: Chart) {
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
      backgroundColor: chartInfo.intervals.map((_, index) => GbExploreStatisticsResultsComponent.getBackgroundColor(index))
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


  private newChart(canvas: HTMLCanvasElement) {


    const chart = new Chart(canvas, {
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


    return chart
  }


}
