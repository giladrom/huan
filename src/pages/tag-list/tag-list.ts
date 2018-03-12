import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { BleProvider } from '../../providers/ble/ble';
import { Observable } from 'rxjs/Observable';
import { IBeaconPluginResult, Beacon } from '@ionic-native/ibeacon';

/**
 * Generated class for the TagListPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-tag-list',
  templateUrl: 'tag-list.html',
})
export class TagListPage {
  tags$: Observable<Beacon[]>;
  timer: any;

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private ble: BleProvider) {
      
  }

  ionViewDidEnter() {
    console.log('ionViewDidLoad TagListPage');

    this.timer = setInterval(() => this.refresh(), 1000);
  }

  ionViewDidLeave() {
    clearInterval(this.timer);
  }

  refresh() {
    this.tags$ = this.ble.getTags();
  }
}
