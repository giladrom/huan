import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { UtilsProvider } from '../utils/utils';
import { Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';

export interface Settings {
  regionNotifications: boolean,
  tagNotifications: boolean
};


@Injectable()
export class SettingsProvider {
  private settings: Settings;

  constructor(public http: HttpClient,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    private platform: Platform) {
    console.log('Hello SettingsProvider Provider');

    platform.ready().then(() => {
      this.loadSettings();
    })
  }

  loadSettings() {
    this.utils.getUserId().then(uid => {
      console.log("Loading settings for user " + uid);

      var setRef = this.afs.collection('Users').doc(uid);
      setRef.snapshotChanges().subscribe((data) => {
        console.log("Settings: " + JSON.stringify(data.payload.data()));

        if (data.payload.data().settings) {
          console.log("Loading configuration settings");

          this.settings = <Settings>data.payload.data().settings;
        } else {
          console.log("No settings found for user, initializing with defaults");

          data.payload.ref.update({
            settings:
              {
                regionNotifications: true,
                tagNotifications: true
              }
          });
        }
      })
    }).catch(() => {
      console.error("Unable to load settings, user is not logged in");
    })
  }

  getSettings() {
    return this.settings;
  }

  setRegionNotifications(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.regionNotifications': value });
    })
  }

  setTagNotifications(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.tagNotifications': value });
    })
  }
}
