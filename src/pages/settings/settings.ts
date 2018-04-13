import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { SettingsProvider } from '../../providers/settings/settings';

import { BleProvider } from '../../providers/ble/ble';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {
  private config;

 
  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    private settings: SettingsProvider,
    private ble: BleProvider,
    private platform: Platform) {

    this.platform.ready().then(() => {
      //this.settings.loadSettings();
      this.settings.getSettings().then(settings => {
        this.config = settings;
      })
    });
  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

  updateRegionNotifications() {
    this.settings.setRegionNotifications(this.config.regionNotifications);
  }

  updateTagNotifications() {
    this.settings.setTagNotifications(this.config.tagNotifications);
  }

  updateEnableMonitoring() {
    this.settings.setEnableMonitoring(this.config.enableMonitoring);

    console.log("enableMonitoring set to: " + this.config.enableMonitoring);
    if (this.config.enableMonitoring) {
      console.log("Enabling monitoring");
      this.ble.enableMonitoring();
    } else {
      this.ble.disableMonitoring();
    }
  }

 

}
