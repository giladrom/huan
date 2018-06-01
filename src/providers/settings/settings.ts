import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument
} from 'angularfire2/firestore';
import { UtilsProvider } from '../utils/utils';
import { Pro } from '@ionic/pro';
import { UserAccount, AuthProvider } from '../auth/auth';
import { normalizeURL, Platform } from 'ionic-angular';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AngularFireAuth } from 'angularfire2/auth';
import { Subscription } from 'rxjs/Subscription';

export interface Settings {
  regionNotifications: boolean | false;
  tagNotifications: boolean | false;
  communityNotifications: boolean | true;
  enableMonitoring: boolean | true;
  showWelcome: boolean | true;
  shareContactInfo: boolean | false;
}

@Injectable()
export class SettingsProvider implements OnDestroy {
  private settings: Settings;
  private settings$: BehaviorSubject<Settings> = new BehaviorSubject<Settings>(
    null
  );

  private userDoc: AngularFirestoreDocument<any>;

  private account: UserAccount;
  private settings_loaded: Boolean;

  private authSubscription: Subscription = new Subscription();

  // Ionic Pro Live Deploy
  public deployChannel = '';
  public isBeta = false;
  public downloadProgress = 0;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private utils: UtilsProvider,
    private authProvider: AuthProvider,
    private platform: Platform
  ) {
    console.log('Hello SettingsProvider Provider');

    this.settings_loaded = false;

    const subscription = this.afAuth.auth.onAuthStateChanged(user => {
      if (user) {
        this.loadSettings();
      }
    });

    this.authSubscription.add(subscription);
  }

  loadSettings() {
    console.log('SettingsProvider: loadSettings()');

    this.authProvider
      .getUserInfo()
      .then(user => {
        console.log('SettingsProvider: Loading settings for user ' + user.uid);

        this.userDoc = this.afs.collection('Users').doc(user.uid);

        this.userDoc.valueChanges().subscribe(data => {
          if (data !== undefined && data['settings'] !== undefined) {
            this.settings = <Settings>data['settings'];
          } else {
            console.log(
              'SettingsProvider: No settings found for user, initializing with defaults'
            );

            this.settings = {
              regionNotifications: false,
              communityNotifications: true,
              tagNotifications: false,
              enableMonitoring: true,
              showWelcome: true,
              shareContactInfo: true
            };

            if (user.signin == 'Facebook') {
              this.account = {
                displayName: user.displayName,
                photoURL: user.photoURL,
                phoneNumber: user.phoneNumber,
                address: ''
              };
            } else {
              this.account = {
                displayName: 'Pet Owner',
                photoURL: normalizeURL('assets/imgs/anonymous2.png'),
                phoneNumber: '',
                address: ''
              };
            }

            this.userDoc
              .update({
                settings: this.settings,
                account: this.account
              })
              .catch(error => {
                console.error(
                  'SettingsProvider: loadSettings(): Unable to initialize settings: ' +
                    error
                );
              });
          }

          console.log('SettingsProvider: Pushing updated Settings');
          this.settings$.next(this.settings);

          this.settings_loaded = true;
        });
      })
      .catch(error => {
        console.error(
          'SettingsProvider: loadSettings(): Unable to load settings, user is not logged in; ' +
            JSON.stringify(error)
        );
      });
  }

  cleanup() {
    console.log('SettingsProvider: Cleaning up...');
    this.settings_loaded = false;
    // this.settings = undefined;
    // this.settings$.complete();
  }

  getSettings(): BehaviorSubject<Settings> {
    return this.settings$;

    // return new Promise<any>(async (resolve, reject) => {
    //   try {
    //     await this.loadSettings();
    //   } catch (error) {
    //     console.error('getSettings: error: ' + JSON.stringify(error));
    //     reject(error);
    //   }

    //   resolve(this.settings);
    // });
  }

  setRegionNotifications(value: boolean) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.regionNotifications': value });
    });
  }

  setTagNotifications(value: boolean) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.tagNotifications': value });
    });
  }

  setCommunityNotifications(value: boolean) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.communityNotifications': value });
    });
  }

  setEnableMonitoring(value: boolean) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.enableMonitoring': value });
    });
  }

  setShowWelcome(value: boolean) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.showWelcome': value });
    });
  }

  setShareContactInfo(value: boolean) {
    this.authProvider.getUserId().then(uid => {
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

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }
}
