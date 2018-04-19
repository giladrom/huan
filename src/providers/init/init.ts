import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UtilsProvider } from '../utils/utils';
import { SettingsProvider } from '../settings/settings';
import { BleProvider } from '../ble/ble';

@Injectable()
export class InitProvider {

  constructor(public http: HttpClient,
    private utils: UtilsProvider,
    private settings: SettingsProvider,
    private ble: BleProvider) {
    console.log('Hello InitProvider Provider');
  }

  initializeApp() {
    this.settings.getSettings().then(() => {
      console.log("initializeApp: Loaded Settings");

      this.ble.init();
    }).catch(error => {
      console.error("initializeApp: Error loading Settings: " + error);
    });
  }

  shutdownApp() {
    this.ble.stop();
  }
}
