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
    private settingsProvider: SettingsProvider,
    private ble: BleProvider,
    private platform: Platform
  ) {
    this.config = {
      regionNotifications: false,
      communityNotifications: true,
      tagNotifications: false,
      enableMonitoring: true,
      showWelcome: true,
      shareContactInfo: true
    };

    this.platform.ready().then(() => {
      this.settingsProvider.getSettings().subscribe(settings => {
        if (settings) {
          this.config = <Settings>settings;
          // console.log('Settings: ' + JSON.stringify(this.config));
        }
      });
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

  updateRegionNotifications() {
    this.settingsProvider.setRegionNotifications(
      this.config.regionNotifications
    );
  }

  updateTagNotifications() {
    this.settingsProvider.setTagNotifications(this.config.tagNotifications);
  }

  updateCommunityNotifications() {
    this.settingsProvider.setCommunityNotifications(
      this.config.communityNotifications
    );
  }

  updateEnableMonitoring() {
    this.settingsProvider.setEnableMonitoring(this.config.enableMonitoring);

    console.log('enableMonitoring set to: ' + this.config.enableMonitoring);
    if (this.config.enableMonitoring) {
      console.log('Enabling monitoring');
      this.ble.enableMonitoring();
    } else {
      this.ble.disableMonitoring();
    }
  }

  updateShareContactInfo() {
    this.settingsProvider.setShareContactInfo(this.config.shareContactInfo);
  }
}
