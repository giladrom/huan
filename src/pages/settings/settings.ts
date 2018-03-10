import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';


//XXX Add Settings DB document per user

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {
  settings = {
    regionNotifications: false
  };

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

  updateRegionNotifications() {
    //this.data.regionNotifications = !this.data.regionNotifications;
  }
}
