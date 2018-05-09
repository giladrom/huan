import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { UtilsProvider } from '../utils/utils';
import { Pro } from '@ionic/pro';
import { UserAccount, AuthProvider } from '../auth/auth';

export interface Settings {
  regionNotifications?: boolean | null;
  tagNotifications?: boolean | null;
  enableMonitoring?: boolean | null;
  showWelcome?: boolean | null;
  shareContactInfo?: boolean | null;
}

@Injectable()
export class SettingsProvider {
  private settings: Settings;
  private account: UserAccount;
  private settings_loaded: Boolean;

  // Ionic Pro Live Deploy
  public deployChannel = '';
  public isBeta = false;
  public downloadProgress = 0;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    private authProvider: AuthProvider
  ) {
    console.log('Hello SettingsProvider Provider');

    this.settings_loaded = false;

    //this.checkChannel();
  }

  loadSettings() {
    return new Promise<any>((resolve, reject) => {
      console.log('loadSettings()');

      if (this.settings_loaded) {
        console.log('*** *** Settings already loaded');
        resolve(true);
      }

      this.authProvider
        .getUserInfo()
        .then(user => {
          console.log('Loading settings for user ' + user.uid);

          var unsubscribe = this.afs
            .collection('Users')
            .doc(user.uid)
            .ref.onSnapshot(data => {
              unsubscribe();

              console.log('*** SETTINGS: ' + JSON.stringify(data.data()));

              if (
                data.data() !== undefined &&
                data.data().settings !== undefined
              ) {
                this.settings = <Settings>data.data().settings;
              } else {
                console.log(
                  'No settings found for user, initializing with defaults'
                );

                this.settings = {
                  regionNotifications: false,
                  tagNotifications: false,
                  enableMonitoring: true,
                  showWelcome: true,
                  shareContactInfo: true
                };

                this.account = {
                  displayName: user.displayName,
                  photoURL: user.photoURL,
                  phoneNumber: user.phoneNumber,
                  address: ''
                };

                data.ref
                  .update({
                    settings: this.settings,
                    account: this.account
                  })
                  .catch(error => {
                    console.error(
                      'loadSettings(): Unable to initialize setings: ' + error
                    );
                  });
              }

              this.settings_loaded = true;
              resolve(true);
            });
        })
        .catch(error => {
          //console.error("loadSettings: Unable to load settings, user is not logged in; " + JSON.stringify(error));
          reject(error);
        });
    });
  }

  cleanup() {
    console.log('SettingsProvider: Cleaning up...');
    this.settings_loaded = false;
    this.settings = undefined;
  }

  getSettings(): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      try {
        await this.loadSettings();
      } catch (error) {
        console.error('getSettings: error: ' + JSON.stringify(error));
        reject(error);
      }

      resolve(this.settings);
    });
  }

  setRegionNotifications(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.regionNotifications': value });
    });
  }

  setTagNotifications(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.tagNotifications': value });
    });
  }

  setEnableMonitoring(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.enableMonitoring': value });
    });
  }

  setShowWelcome(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.showWelcome': value });
    });
  }

  setShareContactInfo(value: boolean) {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.shareContactInfo': value });
    });
  }

  // XXX Ionic Pro

  async checkChannel() {
    try {
      const res = await Pro.deploy.info();
      this.deployChannel = res.channel;
      this.isBeta = this.deployChannel === 'Beta';
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:
      // Pro.monitoring.exception(err);
    }
  }

  async toggleBeta() {
    const config = {
      channel: this.isBeta ? 'Beta' : 'Production'
    };

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
      const resp = await Pro.deploy.checkAndApply(true, function(progress) {
        this.downloadProgress = progress;
      });

      if (resp.update) {
        // We found an update, and are in process of redirecting you since you put true!
      } else {
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

      if (haveUpdate) {
        this.downloadProgress = 0;

        await Pro.deploy.download(progress => {
          this.downloadProgress = progress;
        });
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
