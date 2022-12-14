import { takeUntil, catchError, retry } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { Injectable, OnDestroy } from "@angular/core";
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from "@angular/fire/firestore";
import { UserAccount, AuthProvider } from "../auth/auth";
import {
  BehaviorSubject,
  Subscription,
  Subject,
  throwError as observableThrowError,
} from "rxjs";
import { NativeStorage } from "@ionic-native/native-storage";

export interface Settings {
  regionNotifications: boolean | false;
  tagNotifications: boolean | false;
  communityNotifications: boolean | true;
  communityNotificationString: string | "";
  enableMonitoring: boolean | true;
  monitoringFrequency: number | 2;
  showWelcome: boolean | true;
  shareContactInfo: boolean | false;
  highAccuracyMode: boolean | false;
  sensor: boolean | false;
  petListMode: any | "grid";
  homeAloneMode: any | false;
  emergencyContacts: any | [];
  sendEmailAlerts: boolean | true;
  sendTextAlerts: boolean | true;
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
  public deployChannel = "";
  public isBeta = false;
  public downloadProgress = 0;

  private win: any = window;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private authProvider: AuthProvider,
    private nativeStorage: NativeStorage
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
    console.log("SettingsProvider: Initializing...");

    this.destroyed$ = new Subject();
    this.settings$ = new BehaviorSubject<Settings>(null);

    this.authProvider
      .getUserInfo()
      .then((user) => {
        console.log("SettingsProvider: Loading settings for user " + user.uid);

        this.userDoc = this.afs.collection("Users").doc(user.uid);

        let unsub = this.userDoc
          .valueChanges()
          .pipe(
            catchError((e) => observableThrowError(e)),
            retry(10),
            takeUntil(this.destroyed$)
          )
          .subscribe(
            (data) => {
              console.log("data: " + JSON.stringify(data));

              const account = data;

              if (account !== null && account.settings !== undefined) {
                this.settings = <Settings>account.settings;
                this.settings$.next(this.settings);
                this.settings_loaded = true;
              } else {
                console.error("SettingsProvider: No settings found for user!");
              }
              unsub.unsubscribe();
            },
            (error) => {
              console.error("SettingsProvider: Unable to get user settings");
            }
          );

        this.docSubscription = this.userDoc
          .valueChanges()
          .pipe(takeUntil(this.destroyed$))
          .subscribe((data) => {
            console.log("SettingsProvider: Pushing updated Settings");
            this.settings$.next(this.settings);

            this.settings_loaded = true;
          });
      })
      .catch((error) => {
        console.error(
          "SettingsProvider: loadSettings(): Unable to load settings, user is not logged in; " +
            JSON.stringify(error)
        );
      });
  }

  setAccountName(name) {
    this.name = name;
  }

  stop() {
    console.log("SettingsProvider: Shutting Down...");

    if (this.docSubscription) {
      console.log("SettingsProvider: Unsubscribing from docSubscription");
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

  setEmailAlerts(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.emailAlerts": value });
      })
      .catch((e) => {
        console.error("setEmailAlerts", JSON.stringify(e));
      });
  }

  setTextAlerts(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.textAlerts": value });
      })
      .catch((e) => {
        console.error("setTextAlerts", JSON.stringify(e));
      });
  }

  setRegionNotifications(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.regionNotifications": value });
      })
      .catch((e) => {
        console.error("setRegionNotifications", JSON.stringify(e));
      });
  }

  setTagNotifications(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.tagNotifications": value });
      })
      .catch((e) => {
        console.error("setTagNotifications", JSON.stringify(e));
      });
  }

  setCommunityNotifications(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.communityNotifications": value });
      })
      .catch((e) => {
        console.error("setCommunityNotifications", JSON.stringify(e));
      });
  }

  setCommunityNotificationString(value: string) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.communityNotificationString": value });

        this.settings.communityNotificationString = "";
        // this.settings$.next(this.settings);
      })
      .catch((e) => {
        console.error("setCommunityNotificationString", JSON.stringify(e));
      });
  }

  setEnableMonitoring(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.enableMonitoring": value });
      })
      .catch((e) => {
        console.error("setEnableMonitoring", JSON.stringify(e));
      });
  }

  setEnableSensorMode(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.sensor": value });
      })
      .catch((e) => {
        console.error("setEmailAlerts", JSON.stringify(e));
      });

    if (!value) {
      this.nativeStorage
        .remove("sensor")
        .then((r) => {
          console.log("remove sensor", r);
        })
        .catch((e) => {
          console.error("remove sensor", JSON.stringify(e));
        });
    }
  }

  setMonitoringFrequency(value: number) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.monitoringFrequency": value });
      })
      .catch((e) => {
        console.error("setMonitoringFrequency", JSON.stringify(e));
      });
  }

  setPetListMode(value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvider.getUserId().then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef
          .update({ "settings.petListMode": value })
          .then(() => {
            resolve();
          })
          .catch(() => {
            reject();
          });
      });
    });
  }

  setHomeAloneMode(value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvider.getUserId().then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef
          .update({ "settings.homeAloneMode": value })
          .then(() => {
            resolve();
          })
          .catch(() => {
            reject();
          });
      });
    });
  }

  setEmergencyContacts(value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvider.getUserId().then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef
          .update({ "settings.emergencyContacts": value })
          .then(() => {
            resolve();
          })
          .catch(() => {
            reject();
          });
      });
    });
  }

  setShowWelcome(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.showWelcome": value });
      })
      .catch((e) => {
        console.error("setShowWelcome", JSON.stringify(e));
      });
  }

  setShareContactInfo(value: boolean) {
    this.authProvider
      .getUserId()
      .then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.shareContactInfo": value });
      })
      .catch((e) => {
        console.error("setShareContactInfo", JSON.stringify(e));
      });
  }

  setHighAccuracyMode(value: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      this.authProvider.getUserId().then((uid) => {
        var setRef = this.afs.collection("Users").doc(uid);
        setRef.update({ "settings.highAccuracyMode": value }).then((r) => {
          if (!value) {
            this.nativeStorage
              .remove("highAccuracy")
              .then((r) => {
                resolve();
              })
              .catch((e) => {
                console.error("nativeStorage", JSON.stringify(e));
                reject(e);
              });
          } else {
            this.nativeStorage
              .setItem("highAccuracy", true)
              .then(() => {
                resolve();
              })
              .catch((e) => {
                console.error("nativeStorage", e);
                reject(e);
              });
          }
        });
      });
    });
  }

  ngOnDestroy() {
    // this.authSubscription.unsubscribe();
  }
}
