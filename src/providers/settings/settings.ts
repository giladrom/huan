import { takeUntil, catchError, retry } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument
} from 'angularfire2/firestore';
import { UtilsProvider } from '../utils/utils';
import { UserAccount, AuthProvider } from '../auth/auth';
import { Platform, normalizeURL } from 'ionic-angular';
import {
  BehaviorSubject,
  Subscription,
  Subject,
  throwError as observableThrowError
} from 'rxjs';
import { AngularFireAuth } from 'angularfire2/auth';
import { WebView } from '@ionic-native/ionic-webview';

export interface Settings {
  regionNotifications: boolean | false;
  tagNotifications: boolean | false;
  communityNotifications: boolean | true;
  communityNotificationString: string | '';
  enableMonitoring: boolean | true;
  monitoringFrequency: number | 2;
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

  private name;

  // Ionic Pro Live Deploy
  public deployChannel = '';
  public isBeta = false;
  public downloadProgress = 0;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private authProvider: AuthProvider
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
            retry(10),
            takeUntil(this.destroyed$)
          )
          .subscribe(
            data => {
              console.log('data: ' + JSON.stringify(data));

              const account = data;

              if (account !== null && account.settings !== undefined) {
                this.settings = <Settings>account.settings;
                this.settings$.next(this.settings);
                this.settings_loaded = true;
              } else {
                console.error('SettingsProvider: No settings found for user!');
              }
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

  initializeSettings(user) {
    this.settings = {
      regionNotifications: false,
      communityNotifications: true,
      communityNotificationString: '',
      tagNotifications: false,
      enableMonitoring: true,
      monitoringFrequency: 2,
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
        photoURL: user.photoURL
      };
    } else {
      this.account = {
        displayName: this.name,
        photoURL: normalizeURL('assets/imgs/anonymous2.png')
      };
    }

    this.userDoc
      .set(
        {
          settings: this.settings,
          account: this.account
        },
        { merge: true }
      )
      .then(() => {
        this.settings$.next(this.settings);
        this.settings_loaded = true;
      })
      .catch(error => {
        console.error(
          'SettingsProvider: loadSettings(): Unable to initialize settings: ' +
            error
        );
      });
  }

  setAccountName(name) {
    this.name = name;
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

  setMonitoringFrequency(value: number) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ 'settings.monitoringFrequency': value });
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

  ngOnDestroy() {
    // this.authSubscription.unsubscribe();
  }
}
