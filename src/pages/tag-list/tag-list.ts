import {
  IonicPage,
  NavController,
  NavParams,
  LoadingController,
  AlertController
} from 'ionic-angular';
import { BleProvider } from '../../providers/ble/ble';
import { Observable } from 'rxjs/Observable';
import { Beacon } from '@ionic-native/ibeacon';
import { ChartComponent } from 'angular2-chartjs';
import { Component, ViewChild } from '@angular/core';
import { UtilsProvider } from '../../providers/utils/utils';
import { IsDebug } from '../../../node_modules/@ionic-native/is-debug';

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

  private loader;
  private devel;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private ble: BleProvider,
    public loadingCtrl: LoadingController,
    private utilsProvider: UtilsProvider,
    private isDebug: IsDebug,
    private alertCtrl: AlertController
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

    this.isDebug.getIsDebug().then(dbg => {
      this.devel = dbg;
    });
  }

  ionViewDidEnter() {
    console.log('ionViewDidLoad TagListPage');

    this.ble.startScan();
    this.tags$ = this.ble.getTags();

    // this.timer = setInterval(() => this.refresh(), 1000);
  }

  ionViewWillLeave() {
    this.ble.stopScan();

    // this.active = false;
    //this.chart1.chart.stop();
    // clearInterval(this.timer);
  }

  updateTagSettings(device_id) {
    console.log('Updating settings for ' + device_id);

    this.showLoading();
    this.ble
      .updateTagInfo(device_id)
      .then(() => {
        this.dismissLoading();

        this.utilsProvider.displayAlert('Settings updated Successfully');
      })
      .catch(e => {
        this.dismissLoading();

        this.utilsProvider.displayAlert('Unable to update settings', e);
      });
  }

  programTag(device_id) {
    let alert = this.alertCtrl.create({
      title: 'Program Tag',
      inputs: [
        {
          name: 'major',
          placeholder: '1'
        },
        {
          name: 'minor',
          placeholder: '500'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Do it!',
          handler: data => {
            if (
              Number(data.minor) > 100 &&
              Number(data.minor) < 65000 &&
              Number(data.major) < 65000
            ) {
              console.log('Programming settings for ' + device_id);

              this.showLoading();
              this.ble
                .programTag(device_id, data.major, data.minor)
                .then(() => {
                  this.dismissLoading();

                  this.utilsProvider.displayAlert(
                    'Tag programmed Successfully'
                  );
                })
                .catch(e => {
                  this.dismissLoading();

                  this.utilsProvider.displayAlert('Unable to program tag', e);
                });
            } else {
              this.utilsProvider.displayAlert(
                `programTag: Invalid parameters`,
                `${data.major}/${data.minor}`
              );

              return false;
            }
          }
        }
      ]
    });
    alert.present();
  }

  ionViewWillEnter() {
    // this.active = true;
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: 'Please Wait...'
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
  }

  refresh() {
    // var i = 0;

    var colors = ['blue', 'teal', 'orange', 'black', 'red', 'yellow'];

    this.tags$ = this.ble.getTags();

    // if (this.tags$ != undefined) {
    //   this.tags$.forEach(beacon => {
    //     var index = 0;
    //     beacon.forEach(b => {
    //       if (this.chartData[index]) {
    //         this.chartData[index].push(b.rssi);

    //         if (this.chartData[index].length > 30)
    //           this.chartData[index].shift();

    //         var ds = {
    //           label: 'Tag ' + b.minor.toString(),
    //           borderColor: colors[index],
    //           data: this.chartData[index]
    //         };

    //         this.chartDataSets[index] = ds;
    //       } else {
    //         console.log('Initializing dataset for beacon No ' + index);

    //         this.chartData[index] = [0];
    //         this.chartDataSets[index] = [0];

    //         this.xaxis[index] = 1;
    //       }

    //       index++;
    //     });

    //     if (this.active) {
    //       this.chartLabels.push('');
    //       if (this.chartLabels.length > 30) this.chartLabels.shift();

    //       this.data = {
    //         labels: this.chartLabels,

    //         datasets: this.chartDataSets
    //       };
    //     }
    //   });
    // }
  }
}
