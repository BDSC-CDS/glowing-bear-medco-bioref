/**
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, ElementRef, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import Chart from 'chart.js';
import { ExploreStatisticsService, ChartInformation } from '../../../../services/explore-statistics.service';

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

  @ViewChild('exploreStatsChartElement', { static: true }) histogramElement: ElementRef;

  chart: Chart;

  chartInfoReceivedAtLeastOnce = false

  // the colour is chosen in BACKGROUND_COLOURS modulo the length of BACKGROUND_COLOURS
  private static getBackgroundColor(index: number): string {
    return GbExploreStatisticsResultsComponent.BACKGROUND_COLOURS[index % GbExploreStatisticsResultsComponent.BACKGROUND_COLOURS.length]
  }


  constructor(exploreStatisticsService: ExploreStatisticsService) {

    exploreStatisticsService.ChartDataEmitter.subscribe((chartInfo: ChartInformation) => {
      console.log(chartInfo.intervals)
      this.updateChart(chartInfo)
    })

  }



  /*
  * Given a ChartInformation object this function will update the counts displayed by the histogram.
  */
  private updateChart(chartInfo: ChartInformation) {
    if (chartInfo && chartInfo.intervals && chartInfo.intervals.length > 0) {
      this.chart.data.labels = chartInfo.intervals.map(i => '[' + i.lowerBound + ', ' + i.higherBound + ']');
      this.chart.data.datasets[0] = {
        data: chartInfo.intervals.map(i => i.count),
        backgroundColor: chartInfo.intervals.map((_, index) => GbExploreStatisticsResultsComponent.getBackgroundColor(index))
      }

      let min, max: number
      max = chartInfo.intervals[0].count
      min = max

      this.chart.options = {
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
              labelString: 'TODO x axis unit',
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
      this.chart.options.scales.yAxes = [{
        ticks: {
          min: minDisplayed
        }
      }]

    } else {
      this.chart.data.labels = [];
      this.chart.data.datasets[0].data = [];
    }

    this.chartInfoReceivedAtLeastOnce = true
    this.chart.update();
  }

  ngOnInit(): void {
    // initialize the chart
    this.chart = new Chart(this.histogramElement.nativeElement, {
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
    });
  }

  // TODO Check how this is used in other components.
  ngOnChanges(changes: SimpleChanges): void {
  }


}
