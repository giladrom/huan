import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { BleProvider } from '../../providers/ble/ble';
import { Observable } from 'rxjs/Observable';
import { Beacon } from '@ionic-native/ibeacon';
import { ChartComponent } from 'angular2-chartjs';
import { Component, ViewChild } from '@angular/core';

@IonicPage()
@Component({
  selector: 'page-tag-list',
  templateUrl: 'tag-list.html'
})
export class TagListPage {
  tags$: Observable<Beacon[]>;
  timer: any;

  chart: any;
  chartData = Array();
  chartLabels = Array();

  type: any;
  data: any;
  options: any;

  xaxis = Array();
  chartDataSets = Array();

  active: Boolean;
  @ViewChild('chart1') chart1: ChartComponent;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private ble: BleProvider
  ) {
    this.refresh();

    this.xaxis = [{}];

    this.type = 'line';
    this.data = {
      labels: ['rssi'],
      datasets: this.chartDataSets
    };
    this.options = {
      //responsive: true,
      maintainAspectRatio: false,
      animation: false
    };
  }

  ionViewDidEnter() {
    console.log('ionViewDidLoad TagListPage');

    this.timer = setInterval(() => this.refresh(), 1000);
  }

  ionViewWillLeave() {
    this.active = false;
    //this.chart1.chart.stop();
    clearInterval(this.timer);
  }

  ionViewWillEnter() {
    this.active = true;
  }

  refresh() {
    // var i = 0;

    var colors = ['blue', 'teal', 'orange', 'black', 'red', 'yellow'];

    this.tags$ = this.ble.getTags();

    if (this.tags$ != undefined) {
      this.tags$.forEach(beacon => {
        var index = 0;
        beacon.forEach(b => {
          if (this.chartData[index]) {
            this.chartData[index].push(b.rssi);

            if (this.chartData[index].length > 30)
              this.chartData[index].shift();

            var ds = {
              label: 'Tag ' + b.minor.toString(),
              borderColor: colors[index],
              data: this.chartData[index]
            };

            this.chartDataSets[index] = ds;
          } else {
            console.log('Initializing dataset for beacon No ' + index);

            this.chartData[index] = [0];
            this.chartDataSets[index] = [0];

            this.xaxis[index] = 1;
          }

          index++;
        });

        if (this.active) {
          this.chartLabels.push('');
          if (this.chartLabels.length > 30) this.chartLabels.shift();

          this.data = {
            labels: this.chartLabels,

            datasets: this.chartDataSets
          };
        }
      });
    }
  }
}
