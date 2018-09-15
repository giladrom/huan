import { takeUntil, catchError, retry } from 'rxjs/operators';
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
import {
  BehaviorSubject,
  Subscription,
  Subject,
  throwError as observableThrowError
} from 'rxjs';
import { AngularFireAuth } from 'angularfire2/auth';

export interface Settings {
  regionNotifications: boolean | false;
  tagNotifications: boolean | false;
  communityNotifications: boolean | true;
  communityNotificationString: string | '';
  enableMonitoring: boolean | true;
  showWelcome: boolean | true;
  shareContactInfo: boolean | false;
}

@Injectable()
export class SettingsProvider implements OnDestroy {
  private destroyed$: Subject<void>;

  private settings: Settings;
  private settings$: BehaviorSubject<Settings> = new BehaviorSubject<Settings>(
    null
  );

  private userDoc: AngularFirestoreDocument<any>;

  private account: UserAccount;
  private settings_loaded: Boolean;

  private authSubscription: Subscription = new Subscription();
  private docSubscription: Subscription;

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
    this.settings_loaded = false;

    // const subscription = this.afAuth.auth.onAuthStateChanged(user => {
    //   if (user) {
    //     this.init();
    //   }
    // });

    // this.authSubscription.add(subscription);
  }

  init() {
    console.log('SettingsProvider: Initializing...');

    this.destroyed$ = new Subject();
    this.settings$ = new BehaviorSubject<Settings>(null);

    this.authProvider
      .getUserInfo()
      .then(user => {
        console.log('SettingsProvider: Loading settings for user ' + user.uid);

        this.userDoc = this.afs.collection('Users').doc(user.uid);

        let unsub = this.userDoc
          .valueChanges()
          .pipe(
            catchError(e => observableThrowError(e)),
            retry(5),
            takeUntil(this.destroyed$)
          )
          .subscribe(
            data => {
              console.log('data: ' + JSON.stringify(data));

              const account = data;

              if (account !== null && account.settings !== undefined) {
                this.settings = <Settings>account.settings;
              } else {
                console.log(
                  'SettingsProvider: No settings found for user, initializing with defaults'
                );

                this.settings = {
                  regionNotifications: false,
                  communityNotifications: true,
                  communityNotificationString: '',
                  tagNotifications: false,
                  enableMonitoring: true,
                  showWelcome: true,
                  shareContactInfo: true
                };

                if (
                  user.providerData[0] !== undefined &&
                  (user.providerData[0].providerId === 'facebook.com' ||
                    user.providerData[0].providerId === 'google.com')
                ) {
                  console.log('*** Facebook/Google login detected');

                  this.account = {
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    phoneNumber: '',
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

              this.settings$.next(this.settings);
              this.settings_loaded = true;

              unsub.unsubscribe();
            },
            error => {
              console.error('SettingsProvider: Unable to get user settings');
            }
          );

        this.docSubscription = this.userDoc
          .valueChanges()
          .pipe(takeUntil(this.destroyed$))
          .subscribe(data => {
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

  stop() {
    console.log('SettingsProvider: Shutting Down...');

    if (this.docSubscription) {
      console.log('SettingsProvider: Unsubscribing from docSubscription');
      this.docSubscription.unsubscribe();
    }

    if (this.destroyed$) {
      this.destroyed$.next();
      this.destroyed$.complete();
    }

    this.settings_loaded = false;
    // this.settings = undefined;
    this.settings$.complete();
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

  setCommunityNotificationString(value: string) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.communityNotificationString': value });

      this.settings.communityNotificationString = '';
      // this.settings$.next(this.settings);
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
      const res = await Pro.deploy.getConfiguration();
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
      await Pro.deploy.configure(config);
      await this.checkChannel();
      await this.sync({ updateMethod: 'auto' }); // Alternatively, to customize how this works, use performManualUpdate()
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

      Ex: Check, Download, Extract when a user logs into your app,
        but Redirect when they logout for an app that is always running
        but used with multiple users (like at a doctors office).
    */

    try {
      const update = await Pro.deploy.checkForUpdate();

      if (update.available) {
        this.downloadProgress = 0;

        await Pro.deploy.downloadUpdate(progress => {
          this.downloadProgress = progress;
        });
        await Pro.deploy.extractUpdate();
        await Pro.deploy.reloadApp();
      }
    } catch (err) {
      // We encountered an error.
      // Here's how we would log it to Ionic Pro Monitoring while also catching:
      // Pro.monitoring.exception(err);
    }
  }

  ngOnDestroy() {
    // this.authSubscription.unsubscribe();
  }
}
