import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { SettingsProvider, Settings } from '../../providers/settings/settings';

import { BleProvider } from '../../providers/ble/ble';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage {
  private config: Settings;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private settings: SettingsProvider,
    private ble: BleProvider,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.settings
        .getSettings()
        .then(settings => {
          this.config = settings;
        })
        .catch(error => {
          console.error('SettingsPage: Unable to load settings');
        });
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

    console.log('enableMonitoring set to: ' + this.config.enableMonitoring);
    if (this.config.enableMonitoring) {
      console.log('Enabling monitoring');
      this.ble.enableMonitoring();
    } else {
      this.ble.disableMonitoring();
    }
  }

  updateShareContactInfo() {
    this.settings.setShareContactInfo(this.config.shareContactInfo);
  }
}
