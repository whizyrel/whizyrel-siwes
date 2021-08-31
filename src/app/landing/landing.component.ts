import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'sws-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  public active = 0;
  public cities = ['Lagos', 'Ogun', 'Abuja', 'Oyo', 'Enugu', 'Anambra', 'Akwa Ibom', 'Nasarawa'];
  public today = new Date();
  public options: any = {
    chart: {
      height: 360,
      type: 'area',
      toolbar: {show: false},
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
    },
    stroke: {
      width: 2,
      curve: 'smooth',
      lineCap: 'butt',
    },
    dataLabels: {
      enabled: false
    },
    series: [
      {
        name: 'Series 1',
        data: [45, 56, 50, 53, 49, 46, 43]
      }
    ],
    grid: {show: false},
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 1,
        opacityTo: 0.5,
        stops: [0, 90, 100]
      },
      colors: ['#3f51b5'],
    },
    colors: ['#3f51b5'],
    xaxis: {
      labels: {
        style: {
          cssClass: 'tspan__label',
        }
      },
      axisTicks: {show: false},
      axisBorder: {color: '#3f51b5'},
      categories: [
        '01 Jan',
        '02 Jan',
        '03 Jan',
        '04 Jan',
        '05 Jan',
        '06 Jan',
        '07 Jan'
      ],
    },
    yaxis: {
      show: false,
    },
    markers: {
      colors: 'white',
      strokeColors: '#3f51b5',
      shape: 'circle',
    },
    tooltip: {
      custom: ({series, seriesIndex, dataPointIndex}: any): any => {
        return `
                <div class="mat-caption custom-tooltip rounded-pill px-3 py-1">
                  <span> ${series[seriesIndex][dataPointIndex]}&deg;C</span>
                </div>
          `;
      }
    }
  };

  constructor() { }

  ngOnInit(): void {
  }

  public getDate(): Date {
    return new Date();
  }
}
