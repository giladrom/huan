import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { SettingsProvider } from '../../providers/settings/settings';

@IonicPage()
@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html',
})
export class SettingsPage {
  private config;

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private settings: SettingsProvider) {
      
      this.settings.loadSettings();
      this.config = this.settings.getSettings();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SettingsPage');
  }

  updateRegionNotifications() {
    this.settings.setRegionNotifications(this.config.regionNotifications);
  }
}
