import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatDatepicker, MatDatepickerInputEvent } from '@angular/material/datepicker';
import { interval, Subscription } from 'rxjs';
import { IMqttMessage, MqttService } from 'ngx-mqtt';
import { FormControl } from '@angular/forms';
import { MAT_DATE_FORMATS } from '@angular/material/core/datetime';

export const MY_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'LL',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'sws-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  // providers: [{provide: MAT_DATE_FORMATS, useValue: MY_FORMATS}],
})
export class LandingComponent implements OnInit, OnDestroy {
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
    series: [ ],
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
      type: 'datetime',
      labels: {
        style: {
          cssClass: 'tspan__label',
        }
      },
      axisTicks: {show: false},
      axisBorder: {color: '#3f51b5'},
      crosshairs: {
        show: true,
      },
      tooltip: {enabled: false},
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
            <span> ${this.convertNumber(series[seriesIndex][dataPointIndex], 2)}&deg;C</span>
          </div>
        `;
      }
    }
  };
  public statIndex = 0;
  public currentStat: any;
  public dataSymbols: {[key in string]: string} = {
    c: '&deg;C',
    f: '&deg;F',
    k: 'K',
    h: '&rho;',
    hi: 'HI',
    dp: '&deg;C',
  };
  public dataImageLink: {[key in string]: string} = {
    c: 'https://storage.googleapis.com/whizyrel-public/cloud.png',
    f: 'https://storage.googleapis.com/whizyrel-public/cloud.png',
    k: 'https://storage.googleapis.com/whizyrel-public/cloud.png',
    h: 'https://storage.googleapis.com/whizyrel-public/humidity.png',
    hi: 'https://storage.googleapis.com/whizyrel-public/heat.png',
    dp: 'https://storage.googleapis.com/whizyrel-public/dew.png',
  };
  public dataTitle: {[key in string]: string} = {
    c: 'Temperature',
    f: 'Temperature',
    k: 'Temperature',
    h: 'relative humidity',
    hi: 'Heat Index',
    dp: 'Dew Point',
  };
  public intervals: any[] = [
    {name: 'Today', apiInterval: 'hour'},
    {name: 'Yesterday', apiInterval: 'hour'},
    {name: 'This Week', apiInterval: 'day'},
    {name: 'Last Week', apiInterval: 'day'},
    {name: 'This Month', apiInterval: 'day'},
  ];
  public objectIntervals: any = {
    Today: this.buildInterval(this.today.getDate(), this.today.getDate() + 1),
    Yesterday: this.buildInterval(this.today.getDate() - 1, this.today.getDate()),
    'This Week': this.buildInterval(this.today.getDate() - (this.today.getDay() - 1), this.today.getDate() + (7 - this.today.getDay() + 1)),
    'Last Week': this.buildInterval(
      this.today.getDate() - (this.today.getDay() - 1) - 7,
      this.today.getDate() - (this.today.getDay() - 1)
    ),
    'This Month': this.buildInterval(
      1,
      new Date(this.today.getFullYear(), this.today.getMonth(), 0).getDate()
    ),
  };
  public apiInterval = 'hour';
  public defaultIntervalText = 'Interval';
  public intervalSubscriptions: Subscription[] = [];
  private baseUrl = `${window.location.protocol}//localhost:9100/d`;
  private DEFAULT_INTERVAL = 60 * 1000 * .5;
  public target: {[key in string]: string} = {weekly: 'c', latest: 'c', interval: 'c'};
  public intervalData: [number, Date][] = [];
  public set _intervalData(v: any[]) {
    if (v) {
      window.localStorage.setItem('ind', JSON.stringify(v));
      this.intervalData = v;
      this.options.series = [
        {
          data: this.intervalData
            .map(d => {
              return {
                x: d[1],
                y: d[0]
              };
            }),
      }
    ];
      console.log(this.options.series[0].data);
    }
  }

  public statsToday: [number, Date][] = [];
  public set _statsToday(v: [number, Date][]) {
    if (v.length > 0) {
      this.currentStat = v[this.statIndex];
      this.statsToday = v;
    }
  }

  public weeklyData: any[] = [];
  public set _weeklyData(v: any[]) {
    if (v) {
      window.localStorage.setItem('kly', JSON.stringify(v));
      this.weeklyData = v;
    }
  }

  public intervalRange: {start?: Date, end?: Date} = {};
  public set _intervalRange(v: any) {
    if (v) {
      this.intervalRange = v;
      this.defaultIntervalText = `${this.intervalRange.start?.toLocaleString()} - ${this.intervalRange.end?.toLocaleString()}`;
      this.getIntervalData();
    }
  }
  public intervalControl = new FormControl();

  constructor(private httpClient: HttpClient, private mqttService: MqttService, private cd: ChangeDetectorRef) {
    this.statsToday = [];
    this.weeklyData = [];
    this.intervalData = [];
  }

  ngOnInit(): void {
    this._intervalRange = {
      start: new Date(
        this.today.getFullYear(),
        this.today.getMonth(),
        this.today.getDate(),
        0, 0,
      ),
      end: new Date(
        this.today.getFullYear(),
        this.today.getMonth(),
        this.today.getDate() + 1,
        0, 0,
      ),
    };
    this.statsToday = [];
    this.weeklyData = [];
    this.intervalData = [];
    this.target = this.target ?? window.localStorage.getItem('gt');
    this.getLatestData();
    this.getIntervalData();
    this.getWeeklyData();

    [this.getWeeklyData.bind(this)]
      .forEach(fn => {
        this.intervalSubscriptions.push(
          interval(this.DEFAULT_INTERVAL)
            .subscribe(fn)
        );
      });

    const mqSub = this.mqttService
      .observe(`/rt/weather-data/${1}`)
      .subscribe(
        (data: IMqttMessage) => {
          this.statsToday = this.transformLatest([JSON.parse(data.payload.toString())]);
        },
        (error) => {
          console.error(`[MQTT] error`, error);
        }
      );

    this.intervalSubscriptions.push(mqSub, this.intervalControl.valueChanges.subscribe((d) => {
      if (d) {
        this._intervalRange = this.objectIntervals[d];
        this.cd.detach();
        this.cd.reattach();
        this.cd.detectChanges();
      }
    }));
  }

  ngOnDestroy(): void {
    this.intervalSubscriptions.forEach(s => s.unsubscribe());
  }

  public setApiInterval(v: any): void {
    this.apiInterval = v;
  }

  public buildInterval(startDay?: any, endDay?: any): any {
    return {
      start: new Date(
        this.today.getFullYear(),
        this.today.getMonth(),
        startDay ?? this.today.getDate() - 1,
        0, 0,
      ),
      end: new Date(
        this.today.getFullYear(),
        this.today.getMonth(),
        endDay ?? this.today.getDate() + 1,
        0, 0,
      ),
    };
  }

  public dateRangeChange(e: MatDatepickerInputEvent<Date>, mode: string): void {
    (this.intervalRange as any)[mode] = e.value;
    this.defaultIntervalText = `${this.intervalRange.start?.toLocaleString().split(',')[0]} - ${this.intervalRange.end?.toLocaleString().split(',')[0]}`;
  }

  private getIntervalData(start?: any, end?: any): void {
    if (this.httpClient) {
      this.httpClient
        .get<{data: [number, Date][]}>(`${this.baseUrl}/interval`, {
          headers: {'Content-type': 'application/json'},
          responseType: 'json',
          observe: 'body',
          params: {
            start: start ?? this.intervalRange?.start?.toJSON(),
            end: end ?? this.intervalRange?.end?.toJSON(),
            interval: this.apiInterval,
            target: this.target.weekly,
            id: 1,
          } as any,
        })
        .subscribe(
          (data: {data: [number, Date][]}) => {
            console.log(`[Interval]`, data.data);
            this._intervalData = data.data;
          },
          (error) => {
            console.error(`[Latest] error`, error);

            this.intervalData = this.intervalData.length ?
              this.intervalData :
              JSON.parse(window.localStorage.getItem('ind') ?? '[]');
          }
        );
    } else {
      console.error(`[Error] latest`, this.httpClient);
    }
  }

  private getLatestData(): void {
    if (this.httpClient) {
      this.httpClient
        .get<{data: [number, Date][]}>(`${this.baseUrl}/latest/?target=${this.target.latest}&id=${1}`, {
          headers: {'Content-type': 'application/json'},
          responseType: 'json',
          observe: 'body'
        })
        .subscribe(
          (data: {data: [number, Date][]}) => {
            this._statsToday = this.transformLatest(data.data);
            window.localStorage.setItem('tst', JSON.stringify(this.transformLatest(data.data)));
          },
          (error) => {
            console.error(`[Latest] error`, error);

            this.statsToday = this.statsToday.length ?
              this.statsToday :
              JSON.parse(window.localStorage.getItem('tst') ?? '[]');
          }
        );
    } else {
      console.error(`[Error] latest`, this.httpClient);
    }
  }

  private transformLatest(data: any[]): any {
    return Object.keys(data[0]).map((k): any => {
      if (['t', 'id'].includes(k) === false) {
        return {
          link: this.dataImageLink[k],
          value: data[0][k],
          unit: this.dataSymbols[k],
          title: this.dataTitle[k],
        };
      }
    })
    .filter(el => el !== undefined)
    .sort((a, b) => {
      return b.value - a.value;
    });
  }

  private getWeeklyData(): void {
    if (this.httpClient) {
      this.httpClient
        .get<{data: [number, Date][]}>(`${this.baseUrl}/weekly/?target=${this.target.weekly}&id=${1}`, {
          headers: {'Content-type': 'application/json'},
          responseType: 'json',
          observe: 'body'
        })
        .subscribe(
          (data: {data: [number, Date][]}) => {
            this._weeklyData = [...data.data];
          },
          (error) => {
            console.error(`[Weekly] error`, error);

            this.weeklyData = this.weeklyData.length ?
              this.weeklyData :
              JSON.parse(window.localStorage.getItem('kly') ?? '[]');
          }
        );
    } else {
      console.error(`[Error] weekly`, this.httpClient);
    }
  }

  public targetChanged(v: MatButtonToggleChange, mode: string): void {
    this.target[mode] = v.value;
    window.localStorage.setItem('gt', JSON.stringify(this.target));
    this.getWeeklyData();
  }

  public convertNumber(no: any, place: number): string {
    return Number.parseFloat(no).toFixed(place);
  }

  public openCustomIntervalPicker(picker: MatDatepicker<any>): void {
    picker.open();
  }

  public nextStat(): void {
    ++this.statIndex;

    if (this.statIndex >= this.statsToday.length) {
      this.statIndex = 0;
    }

    this.currentStat = this.statsToday[this.statIndex];
  }

  public previousStat(): void {
    --this.statIndex;

    if (this.statIndex < 0) {
      this.statIndex = this.statsToday.length - 1;
    }

    this.currentStat = this.statsToday[this.statIndex];
  }

  public getDate(d?: any): Date {
    return new Date(d);
  }
}
