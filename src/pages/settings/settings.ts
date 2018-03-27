import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { SettingsProvider } from '../../providers/settings/settings';

import { Pro } from '@ionic/pro';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {
  private config;

  // Ionic Pro Live Deploy
  public deployChannel = "";
  public isBeta = false;
  public downloadProgress = 0;

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private settings: SettingsProvider) {
      
      this.settings.loadSettings();
      this.config = this.settings.getSettings();

      this.checkChannel();
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

  async checkChannel() {
    try {
      const res = await Pro.deploy.info();
      this.deployChannel = res.channel;
      this.isBeta = (this.deployChannel === 'Beta')
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:

      // Pro.monitoring.exception(err);
    }
  }

  async toggleBeta() {
    const config = {
      channel: (this.isBeta ? 'Beta' : 'Production')
    }

    try {
      await Pro.deploy.init(config);
      await this.checkChannel();
      await this.performAutomaticUpdate(); // Alternatively, to customize how this works, use performManualUpdate()
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:

      // Pro.monitoring.exception(err);
    }

  }

  async performAutomaticUpdate() {

    /*
      This code performs an entire Check, Download, Extract, Redirect flow for
      you so you don't have to program the entire flow yourself. This should
      work for a majority of use cases.
    */

    try {
      const resp = await Pro.deploy.checkAndApply(true, function(progress){
          this.downloadProgress = progress;
      });

      if (resp.update){
        // We found an update, and are in process of redirecting you since you put true!
      }else{
        // No update available
      }
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:

      // Pro.monitoring.exception(err);
    }
  }

  async performManualUpdate() {

    /*
      Here we are going through each manual step of the update process:
      Check, Download, Extract, and Redirect.
      This code is currently exactly the same as performAutomaticUpdate,
      but you could split it out to customize the flow.

      Ex: Check, Download, Extract when a user logs into your app,
        but Redirect when they logout for an app that is always running
        but used with multiple users (like at a doctors office).
    */

    try {
      const haveUpdate = await Pro.deploy.check();

      if (haveUpdate){
        this.downloadProgress = 0;

        await Pro.deploy.download((progress) => {
          this.downloadProgress = progress;
        })
        await Pro.deploy.extract();
        await Pro.deploy.redirect();
      }
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:

      // Pro.monitoring.exception(err);
    }

  }

}
