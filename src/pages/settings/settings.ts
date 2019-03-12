import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { SettingsProvider, Settings } from '../../providers/settings/settings';

import { BleProvider } from '../../providers/ble/ble';
import { Subscription } from 'rxjs';
import { ENV } from '@app/env'

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage implements OnDestroy {
  private config: Settings;
  private subscription: Subscription = new Subscription();
  private frequency_badge;
  devel: any;

  private frequency = [
    {
      val: 10,
      text: 'Dogs are OK'
    },
    {
      val: 5,
      text: 'I love dogs!'
    },
    {
      val: 1,
      text: 'NEVER LEAVE ME'
    }
  ];

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
      communityNotificationString: '',
      tagNotifications: false,
      enableMonitoring: true,
      monitoringFrequency: 2,
      showWelcome: true,
      shareContactInfo: true,
      sensor: false
    };

    this.platform.ready().then(() => {
      if (ENV.mode === "Development") {
        this.devel = true
      }

      const subscription = this.settingsProvider
        .getSettings()
        .subscribe(settings => {
          if (settings) {
            this.config = <Settings>settings;
            console.log('Settings: ' + JSON.stringify(this.config));

            if (!this.config.monitoringFrequency) {
              this.config.monitoringFrequency = 2;
              this.updateMonitoringFrequency(null);
            }

            if (this.config.enableMonitoring) {
              this.frequency_badge = this.frequency[
                this.config.monitoringFrequency - 1
              ].text;
            } else {
              this.frequency_badge = 'Dogs suck';
            }
          }
        });

      this.subscription.add(subscription);
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

    if (this.config.enableMonitoring) {
      this.ble.enableMonitoring();
    } else {
      this.ble.disableMonitoring();
    }
  }

  updateEnableSensorMode() {
    this.settingsProvider.setEnableSensorMode(this.config.sensor);

  }

  updateMonitoringFrequency(ev) {
    console.log(this.config.monitoringFrequency);

    this.settingsProvider.setMonitoringFrequency(
      this.config.monitoringFrequency
    );
  }

  updateShareContactInfo() {
    this.settingsProvider.setShareContactInfo(this.config.shareContactInfo);
  }

  ngOnDestroy() {
    // this.subscription.unsubscribe();
  }

  showPrivacyPolicy() {
    this.navCtrl.push('PrivacyPolicyPage');
  }

  showTermsOfUse() {
    this.navCtrl.push('TermsOfUsePage');
  }
}
