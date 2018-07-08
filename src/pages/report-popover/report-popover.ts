import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController
} from 'ionic-angular';
import { UtilsProvider } from '../../providers/utils/utils';
import { MarkerProvider } from '../../providers/marker/marker';

@IonicPage()
@Component({
  selector: 'page-report-popover',
  templateUrl: 'report-popover.html'
})
export class ReportPopoverPage {
  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public navParams: NavParams,
    private utilsProvider: UtilsProvider,
    private markerProvider: MarkerProvider
  ) {}

  ionViewDidLoad() {
    console.log('ionViewDidLoad ReportPopoverPage');
  }

  sendReport(report) {
    this.utilsProvider.sendReport(report);

    this.viewCtrl.dismiss();
    this.markerProvider.resetMap('mainmap');
  }
}
