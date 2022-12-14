import {
  throwError as observableThrowError,
  Observable,
  Subscription,
  SubscriptionLike as ISubscription,
  ReplaySubject,
  Subject,
  merge,
} from "rxjs";

import {
  retry,
  takeUntil,
  catchError,
  sample,
  map,
  throttleTime,
  first,
  take,
  skip,
  last,
} from "rxjs/operators";
import { forkJoin } from "rxjs/observable/forkJoin";

import { Component, ElementRef, OnDestroy } from "@angular/core";
import {
  NavController,
  AlertController,
  Platform,
  PopoverController,
  IonicPage,
  Nav,
  normalizeURL,
} from "ionic-angular";

import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";

import { UtilsProvider } from "../../providers/utils/utils";

import "firebase/storage";

import { Tag } from "../../providers/tag/tag";

import { AngularFireAuth } from "@angular/fire/auth";

import { DomSanitizer } from "@angular/platform-browser";
import { ViewChild } from "@angular/core";
import { Slides } from "ionic-angular";

// Google Maps API
import {
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMaps,
} from "@ionic-native/google-maps";
import { LocationProvider } from "../../providers/location/location";

import { SettingsProvider } from "../../providers/settings/settings";
import { MarkerProvider } from "../../providers/marker/marker";
import { SplashScreen } from "@ionic-native/splash-screen";
import {
  NotificationProvider,
  Notification,
} from "../../providers/notification/notification";

// import 'rxjs';

import { AuthProvider } from "../../providers/auth/auth";
import { BleProvider } from "../../providers/ble/ble";
import { Toast } from "@ionic-native/toast";

import moment from "moment";
import { Mixpanel } from "@ionic-native/mixpanel";
import { once } from "cluster";

import { AppRate } from "@ionic-native/app-rate";
import { NativeStorage } from "@ionic-native/native-storage";
import { ImageLoader } from "ionic-image-loader";
import { ModalController } from "ionic-angular";
import { UpgradePage } from "../upgrade/upgrade";
import { InAppBrowser } from "@ionic-native/in-app-browser";
import { SearchPartyProvider } from "../../providers/search-party/search-party";

// Define App State
enum AppState {
  APP_STATE_FOREGROUND,
  APP_STATE_BACKGROUND,
}

@IonicPage({ priority: "high" })
@Component({
  selector: "page-home",
  templateUrl: "home.html",
})
export class HomePage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private created$: Subject<boolean> = new Subject();

  tagCollectionRef: AngularFirestoreCollection<Tag>;
  tag$: Observable<Tag[]>;
  tags_lost$: Observable<Tag[]>;
  tags_seen$: Observable<Tag[]>;

  map$: Observable<Tag[]>;
  map_lost$: Observable<Tag[]>;
  map_seen$: Observable<Tag[]>;
  active_users$: Observable<any[]>;
  mobile_sensors$: Observable<Tag[]>;

  viewMode: any;
  private win: any = window;
  private townName = {};

  public myPhotosRef: any;
  @ViewChild(Slides)
  slides: Slides;

  @ViewChild("mainmap") mapElement;
  @ViewChild("canvas")
  canvas: ElementRef;
  @ViewChild("navbutton")
  navButtonElement: ElementRef;

  @ViewChild(Nav) navChild: Nav;

  // Map variables
  map: GoogleMap = null;
  mapReady: boolean = false;
  firstLoad: boolean = true;
  sub = new Subject();

  private subscription: Subscription = new Subscription();

  private drawerHeight = 140;

  private notification$: Subject<Notification[]>;

  private update$: Subject<any>;

  private tagInfo = [];
  private number_of_markers = 0;

  // Runtime errors
  private bluetooth;
  private auth;
  private phone_number_missing = false;
  private address_missing = false;
  private account_info_missing = false;
  private monitoring_enabled = false;
  private home_alone_mode = false;
  private online = true;

  // Welcome banner
  private welcome_banner = false;
  // Review banner
  private review_banner = false;
  // Pack leader
  private pack_leader = false;
  // Lost pet mode
  private lost_pet_mode = false;
  private lost_pets = [];

  private protection_radius = -1;

  // App state

  private state = AppState.APP_STATE_FOREGROUND;

  // Area/invite overlay box variables
  private communityString;
  private areaCovered;
  private usersInvited;
  private team_banner;
  private amount_raised;
  private tags_required_for_next_level;
  private units;
  private rank;
  private progress = 0;

  private number_of_tags = 0;
  private nearby_users = 0;
  private encouraging_message;
  private encouraging_messages = [
    "Feels good, doesn't it?",
    "You're awesome!",
    "An actual hero.",
    "Isn't technology amazing?",
    "Keep it up!",
    "What would they do without you?!",
  ];

  private large_number_of_tags = 255;

  private referral_score = 0;

  private location_object;

  private followSingleMarker = false;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider,
    private authProvider: AuthProvider,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private locationProvider: LocationProvider,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider,
    private splashscreen: SplashScreen,
    private BLE: BleProvider,
    private mixpanel: Mixpanel,
    private nativeStorage: NativeStorage,
    private imageLoader: ImageLoader,
    public modalCtrl: ModalController,
    private iab: InAppBrowser,
    private searchParty: SearchPartyProvider
  ) {
    this.notification$ = new Subject<Notification[]>();

    this.viewMode = "map";

    this.tagCollectionRef = this.afs.collection<Tag>("Tags");

    this.update$ = new Subject<any>();

    // Update map when we are back in foreground mode
    this.platform.resume.subscribe((e) => {
      console.log("### Resumed foreground mode");
      this.state = AppState.APP_STATE_FOREGROUND;

      // Set BLE DB update interval to 2 sec when back in foreground mode
      this.BLE.setUpdateInterval(2000);

      if (this.tagInfo.length > 0) {
        if (this.navCtrl.parent.getSelected().tabTitle === "Map") {
          // Remove obsolete tags from tagInfo
          this.tagInfo.forEach((t, i) => {
            if (!this.markerProvider.exists(t.tagId)) {
              console.info("### Removing tag from tagInfo", t.tagId, t.name);
              this.tagInfo.splice(i, 1);
            }
          });

          this.updateMapView(this.tagInfo);
        }
      }
    });

    // Set background mode
    this.platform.pause.subscribe(() => {
      console.log("### Entered Background mode");
      this.state = AppState.APP_STATE_BACKGROUND;

      // Set BLE DB update interval
      this.BLE.setUpdateInterval(15000);
    });

    // Listen for bluetooth status and enable warning display
    this.platform.ready().then(() => {
      this.locationProvider
        .getLocationObject()
        .then((l) => {
          this.location_object = l;
        })
        .catch((e) => {
          console.error(e);
        });

      // this.BLE.getBluetoothStatus().subscribe((status) => {
      //   this.bluetooth = status;
      // });

      this.bluetooth = true;

      this.BLE.getAuthStatus().subscribe((status) => {
        this.auth = status;
      });

      this.settings
        .getSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe((settings) => {
          if (settings) {
            this.monitoring_enabled = settings.enableMonitoring;
            this.home_alone_mode = settings.homeAloneMode;
          }
        });

      setTimeout(() => {
        let timer;

        this.afs.firestore.app
          .database()
          .ref(".info/connected")
          .on("value", (snapshot) => {
            if (!snapshot.val()) {
              timer = setTimeout(() => {
                this.online = snapshot.val();
              }, 5000);
            } else {
              if (timer) {
                clearTimeout(timer);
              }

              this.online = snapshot.val();
            }
          });
      }, 2000);


      // this.BLE.getTags()
      //   .subscribe((tags: any) => {
      //     tags.forEach((tag) => {
      //       console.log(
      //         `[HOME] BLE SCAN: Tag ${tag.info.minor}: Battery: ${tag.info.batt} RSSI ${tag.info.rssi}`
      //       );
      //     });
      //   });
    });
  }

  addTag() {
    this.welcome_banner = false;
    this.navCtrl.parent.parent.push("AddPage");
  }

  gotoAccountPage() {
    this.navCtrl.parent.parent.push("AccountPage");
  }

  review() {
    this.review_banner = false;

    this.utils.reviewApp();
  }

  showTag(tagItem) {
    this.navCtrl.push("ShowPage", tagItem);
  }

  addExpiringMarkers(type) {
    this.afs
      .collection<Tag>("Reports", (ref) =>
        ref
          .where("timestamp", ">=", Date.now() - 60 * 30 * 1000)
          .where("report", "==", type)
      )
      .stateChanges()
      .pipe(
        catchError((e) => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe((report) => {
        report.forEach((r) => {
          this.markerProvider
            .addReportMarker(r)
            .then((marker) => {
              // Automatically remove markers after 30 minutes
              var deletion_timeout: number =
                r.timestamp.toDate() + 1000 * 60 * 30;

              var time_to_live_ms: number = deletion_timeout - Date.now();

              console.log(
                `Marker ${r.id} has ` +
                time_to_live_ms / 1000 / 60 +
                ` minutes left`
              );

              console.log(
                "Setting deletion timer to " + time_to_live_ms + "ms"
              );

              setTimeout(() => {
                console.log("Deleting marker " + r.id);

                this.markerProvider.deleteMarker(r.id);
              }, time_to_live_ms);

              // console.log('Added expiring marker for report type ' + type);
            })
            .catch((e) => {
              console.error(
                "addExpiringMarkers: Unable to add marker: " + JSON.stringify(e)
              );
            });
        });
      });
  }

  addPersistentMarkers() {
    this.afs
      .collection<Tag>("Reports", (ref) =>
        ref
          .where("report", "==", "pet_friendly")
          .where("timestamp", ">=", Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .stateChanges()
      .pipe(
        catchError((e) => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe((report) => {
        report.forEach((r) => {
          this.locationProvider
            .getLocationObject()
            .then((l) => {
              var locStr = r.location.toString().split(",");
              var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

              // Only add persistent markers within a 50km radius
              if (
                this.utils.distanceInKmBetweenEarthCoordinates(
                  l.latitude,
                  l.longitude,
                  latlng.lat,
                  latlng.lng
                ) < 50
              ) {
                this.markerProvider
                  .addReportMarker(r)
                  .then((marker) => {
                    // console.log('Added persistent marker for report type ' + type);
                  })
                  .catch((e) => {
                    console.error(
                      "addPersistentMarkers: Unable to add marker: " +
                      JSON.stringify(e)
                    );
                  });
              }
            })
            .catch((e) => {
              console.error("Location unavailable: " + e);
            });
        });
      });
  }

  addFixedSensorMarkers() {
    this.afs
      .collection("Nodes")
      .stateChanges()
      .pipe(
        catchError((e) => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe((sensors) => {
        sensors.forEach((sensor) => {
          this.locationProvider
            .getLocationObject()
            .then((l) => {
              var locStr = sensor.location.toString().split(",");
              var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

              // Only add persistent markers within a 50km radius
              if (
                this.utils.distanceInKmBetweenEarthCoordinates(
                  l.latitude,
                  l.longitude,
                  latlng.lat,
                  latlng.lng
                ) < 50
              ) {
                this.markerProvider
                  .addFixedSensorMarker(latlng)
                  .then((marker) => {
                    // console.log('Added persistent marker for report type ' + type);
                  })
                  .catch((e) => {
                    console.error(
                      "addSensorMarkers: Unable to add marker: " +
                      JSON.stringify(e)
                    );
                  });
              }
            })
            .catch((e) => {
              console.error("addSensorMarkers: Location unavailable: " + e);
            });
        });
      });
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("map_page")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    var rando = this.utils.randomIntFromInterval(
      0,
      this.encouraging_messages.length - 1
    );
    this.encouraging_message = this.encouraging_messages[rando];

    console.log(" *********************** ");
    console.log("     ionViewDidEnter     ");
    console.log(" *********************** ");

    this.created$.next(true);
    this.created$.complete();

    // Set BLE DB update interval to 2 sec when map is in view
    this.BLE.setUpdateInterval(2000);
    this.BLE.setForegroundMode();

    this.markerProvider.resetMap("mainmap");
  }

  ionViewDidLeave() {
    this.BLE.setUpdateInterval(1000);
  }

  updateBanner() {
    return new Promise((resolve, reject) => {
      this.utils
        .getCurrentScore("referral")
        .then((s) => {
          console.log("Updating Banner text", s);

          var score: number = Number(s);

          var i = 0;
          var interval = setInterval(() => {
            console.log("referral_score", this.referral_score, score);

            if (this.referral_score == score) {
              clearInterval(interval);
            } else {
              i++;
            }

            this.referral_score = i;
          }, 1000);

          if (score >= 10) {
            this.pack_leader = true;

            this.mixpanel
              .track("pack_leader_banner_shown", { score: score })
              .then(() => { })
              .catch((e) => {
                console.error("Mixpanel Error", e);
              });
          }
          resolve(s);
        })
        .catch((e) => {
          console.error("upateBanner", JSON.stringify(e));
          reject(e);
        });
    });
  }

  ionViewDidLoad() {
    // Actions that only need to be taken once the main map is in view for the first time
    this.created$.subscribe(() => {
      console.log("ionViewDidLoad: Initializing map");

      this.initializeMapView();
    });

    this.settings
      .getSettings()
      .pipe(takeUntil(this.sub))
      .subscribe((settings) => {
        if (settings) {
          this.sub.next(true);
          this.sub.complete();

          if (settings.showWelcome === true) {
            console.log("Displaying welcome popover");

            setTimeout(() => {
              this.welcome_banner = true;
            }, 2500);

            this.settings.setShowWelcome(false);
            // } else {
            //   this.authProvider
            //     .getAccountInfo(false)
            //     .then(account => {
            //       if (account !== undefined) {
            //         // Add warnings if owner info is missing

            //         if (!account.phoneNumber || !account.address) {
            //           this.phone_number_missing = true;
            //           this.account_info_missing = true;
            //         }
            //       }
            //     })
            //     .catch(error => {
            //       console.error(error);
            //     });
          }
        }
      });

    this.authProvider
      .getAccountInfo(true)
      .then((account$) => {
        account$
          .subscribe((account) => {
            if (account !== undefined) {
              if (account.phoneNumber && account.address) {
                if (
                  account.phoneNumber.length === 0 ||
                  account.address.length === 0
                ) {
                  this.account_info_missing = true;
                } else if (
                  account.phoneNumber.length > 0 &&
                  account.address.length > 0
                ) {
                  this.account_info_missing = false;
                }
              }

              if (!account.team || account.team === "none") {
                try {
                  window.document.getElementById("community").style.visibility =
                    "hidden";
                  this.team_banner = "No Team Selected";
                } catch (e) {
                  console.error(JSON.stringify(e));
                }
              } else {
                this.afs
                  .collection("Rescues")
                  .doc(account.team)
                  .valueChanges()
                  .pipe(
                    catchError((e) => observableThrowError(e)),
                    retry(2),
                    takeUntil(this.destroyed$)
                  )
                  .subscribe((t) => {
                    console.log("team", JSON.stringify(t));

                    const team: any = t;
                    this.team_banner = "Team " + team.name;
                    this.amount_raised = team.score * 5;
                    this.tags_required_for_next_level = 250 - team.score;
                    this.progress = (team.score / 250) * 100;

                    try {
                      window.document.getElementById(
                        "community"
                      ).style.visibility = "visible";
                    } catch (e) {
                      console.error(JSON.stringify(e));
                    }
                  });
              }
            }
          })
          .takeUntil(this.destroyed$);
      })
      .catch((error) => {
        console.error("getAccountInfo", error);
      });

    // this.authProvider
    //   .getSubscriptionInfo()
    //   .then((subscription) => {
    //     console.log("getSubscriptionInfo", JSON.stringify(subscription));

    //     if (!subscription.subscription_type) {
    //       this.protection_radius = 2;
    //     } else {
    //       switch (subscription.subscription_type) {
    //         case "com.gethuan.huanapp.community_protection_15_mile_monthly":
    //           this.protection_radius = 30;
    //           break;
    //         case "com.gethuan.huanapp.community_protection_15_mile_monthly_2.99":
    //           this.protection_radius = 30;
    //           break;
    //         case "com.gethuan.huanapp.community_protection_unlimited_monthly":
    //           this.protection_radius = -1;
    //           break;
    //       }
    //     }
    //   })
    //   .catch((e) => {
    //     console.error("getSubscriptionInfo", JSON.stringify(e));
    //     this.protection_radius = 2;
    //   });

    setTimeout(() => {
      this.updateBanner()
        .then((r) => {
          console.log("updateBanner", r);
        })
        .catch((e) => {
          console.error("updateBanner", JSON.stringify(e));
        });
    }, 1000);
  }

  showGetStartedPopover() {
    let alertBox = this.alertCtrl.create({
      title: "Welcome!",
      message: "Let's get started. Click below to add your first pet.",
      buttons: [
        {
          text: "Not Now",
          handler: () => { },
        },
        {
          text: "Add Pet!",
          handler: () => {
            this.addTag();
          },
        },
      ],
      cssClass: "alertclass",
    });

    alertBox
      .present()
      .then(() => {
        this.markerProvider.resetMap("mainmap");
      })
      .catch((e) => {
        console.error("showGetStartedPopover: " + JSON.stringify(e));
      });
  }

  initializeMapView() {
    this.destroyed$ = new ReplaySubject(1);

    console.log(" *********************** ");
    console.log("     initializeMapView   ");
    console.log(" *********************** ");

    this.platform.ready().then(() => {
      setTimeout(() => {
        this.locationProvider
          .getLocationObject()
          .then((current_location) => {
            this.setupMapView(
              this.authProvider.isNewUser() ? null : current_location
            );
          })
          .catch((e) => {
            console.error(
              "initializeMapView(): Unable to get current location",
              JSON.stringify(e)
            );

            this.setupMapView(null);
          });
      }, 100);
    });

    this.nativeStorage
      .getItem("review")
      .then(() => {
        console.log("App already reviewed");
      })
      .catch((e) => {
        console.log("App not reviewed yet");

        this.nativeStorage
          .getItem("app_open")
          .then((app_open) => {
            console.log("app_open", app_open);

            if (!(app_open % 5)) {
              this.review_banner = true;

              this.mixpanel
                .track("review_banner_shown")
                .then(() => { })
                .catch((e) => {
                  console.error("Mixpanel Error", e);
                });
            }

            this.nativeStorage
              .setItem("app_open", app_open + 1)
              .then((r) => {
                console.log("app_open incremented", r);
              })
              .catch((e) => {
                console.error(
                  "app_open unable to increment",
                  JSON.stringify(e)
                );
              });
          })
          .catch((e) => {
            console.error("app_open", JSON.stringify(e));

            this.nativeStorage
              .setItem("app_open", 1)
              .then((r) => {
                console.log("app_open initialized", r);
              })
              .catch((e) => {
                console.error(
                  "app_open unable to initialize",
                  JSON.stringify(e)
                );
              });
          });
      });
  }

  setupLiveMap() {
    console.warn("setupLiveMap");
    // ******************************************
    // LIVE MAP
    // ******************************************

    var live_markers = [];
    var live_circles = [];

    var markers_visible = true;

    this.afs.collection("Coords").doc("Coords").valueChanges().subscribe(evt => {
      console.warn("setupLiveMap Coords received");

      const t: any = evt;
      this.active_users$ = Observable.from(t.data).map(function (value) { return Observable.of(value); })
        .concatAll()
        .scan((acc, value) => [...acc, value], []);


      setTimeout(() => {
        var unsub = this.active_users$.pipe(last()).subscribe((active_users) => {
          try {
            console.warn(
              "active_users",
              active_users.length,
              this.markerProvider.mapReady
            );
          } catch (e) {
            console.error("active_users", e);

          }

          // if (active_users.length > 100) {
          //   unsub.unsubscribe();
          // }

          // XXX FIXME: XXX

          this.locationProvider
            .getLocationObject()
            .then((location_object) => {
              var out_of_bounds = 0;
              active_users.forEach((t) => {
                // console.log("active_user", t);

                try {
                  var loc = t.split(",");
                  var latlng = new LatLng(Number(loc[0]), Number(loc[1]));
                } catch (e) {
                  console.error("location split", e);
                }

                // console.log("latlng", JSON.stringify(latlng));
                // Only add live markers within a ~10km radius
                if (
                  latlng != null
                  &&
                  this.utils.distanceInKmBetweenEarthCoordinates(
                    location_object.latitude,
                    location_object.longitude,
                    latlng.lat,
                    latlng.lng
                  ) < 200
                ) {
                  var rando = this.utils.randomIntFromInterval(1, 8);

                  var icon = "active_user-" + rando + ".png";
                  var url = this.win.Ionic.WebView.convertFileSrc(
                    "assets/imgs/" + icon
                  );

                  // console.log("Adding live marker", url);

                  if (this.platform.is('mobile')) {
                    this.markerProvider
                      .getMap()
                      .addMarker({
                        icon: {
                          url: url,
                          size: {
                            width: 24,
                            height: 24,
                          },
                        },
                        flat: false,
                        position: latlng,
                        disableAutoPan: true,
                        id: t.tagId,
                      })
                      .then((live_marker) => {
                        live_markers.push(live_marker);
                      })
                      .catch((e) => {
                        console.error(e);
                      });
                  } else {

                    this.markerProvider.getMap().addCircle({
                      'center': latlng,
                      'radius': 100,
                      fillColor: '#3388ff',
                      strokeColor: '#ffffff',
                      strokeWidth: 1
                    }).then((circle) => {
                      live_circles.push(circle);
                    })
                      .catch((e) => {
                        console.error(e);
                      });

                  }

                  if (
                    this.utils.distanceInKmBetweenEarthCoordinates(
                      location_object.latitude,
                      location_object.longitude,
                      latlng.lat,
                      latlng.lng
                    ) < 16
                  ) {
                    this.nearby_users++;
                    console.log("Nearby users", this.nearby_users);
                  }
                } else {
                  out_of_bounds++;
                }
              });

              console.log(`Added ${live_markers.length} markers`);
            })
            .catch((e) => {
              console.error("setupLiveMap getLocationObject", e);
            });
        });


      }, 300)
    }, error => {
      console.error("Coords", error);
    });



    // this.active_users$ = this.afs
    //   .collection<Tag>("Tags", (ref) =>
    //     ref
    //       .where("lost", "==", false)
    //       .where("tagattached", "==", true)
    //       .where("location", ">", "")
    //   )
    //   .valueChanges()
    //   .pipe(
    //     catchError((e) => observableThrowError(e)),
    //     retry(2),
    //     takeUntil(this.destroyed$)
    //   );


    var mobile_sensor_markers = [];

    this.mobile_sensors$ = this.afs
      .collection("Sensors")
      .stateChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        ),
        throttleTime(10000)
      );

    this.mobile_sensors$.subscribe((mobile_sensors) => {
      mobile_sensors.forEach((mobile_sensor) => {
        console.log("sensor", mobile_sensor.id, mobile_sensor.location);

        var loc = mobile_sensor.location.split(",");
        var latlng = new LatLng(Number(loc[0]), Number(loc[1]));

        var marker = mobile_sensor_markers.find((x) => {
          return x.get("id") === mobile_sensor.id;
        });
        if (marker) {
          console.log("Refreshing", marker.get("id"));
          marker.setPosition(latlng);
        } else {
          console.log("Initializing", mobile_sensor.id);

          this.markerProvider
            .getMap()
            .addMarker({
              icon: {
                url: this.platform.is("ios")
                  ? "www/assets/imgs/mobile_sensor-2.png"
                  : "assets/imgs/mobile_sensor-2.png",
                size: {
                  width: 96,
                  height: 89,
                },
              },
              flat: false,
              position: latlng,
              disableAutoPan: true,
              id: mobile_sensor.id,
            })
            .then((mobile_sensor_marker) => {
              mobile_sensor_markers.push(mobile_sensor_marker);
              console.log("Initialized", mobile_sensor_marker.get("id"));
            })
            .catch((e) => {
              console.error(e);
            });
        }
      });
    });

    this.markerProvider
      .getMap()
      .on(GoogleMapsEvent.CAMERA_MOVE_END)
      .pipe(catchError((error) => observableThrowError(error)))
      .subscribe(
        (event) => {
          const zoom = event[0].zoom;

          console.log(zoom);
          if (zoom > 12.5) {
            markers_visible = false;
            live_markers.forEach((live_marker) => {
              live_marker.setVisible(false);
            });

            live_circles.forEach((circle) => {
              circle.setVisible(false);
            });

            mobile_sensor_markers.forEach((mobile_sensor_marker) => {
              mobile_sensor_marker.setVisible(false);
            });
          } else {
            if (!markers_visible) {
              live_markers.forEach((live_marker) => {
                live_marker.setVisible(true);
              });

              live_circles.forEach((circle) => {
                circle.setVisible(true);
              });

              mobile_sensor_markers.forEach((mobile_sensor_marker) => {
                mobile_sensor_marker.setVisible(true);
              });

              markers_visible = true;
            }
          }
        },
        (error) => { }
      );
    // ******************************************
    // END LIVE MAP
    // ******************************************
  }

  setupMapView(location_object) {
    setTimeout(() => {
      this.splashscreen.hide();
    }, 300);

    this.markerProvider
      .init('mainmap', location_object)
      .then(() => {
        // this.splashscreen.hide();

        // Return tags for display, filter by uid
        this.authProvider.getUserId().then((uid) => {
          console.log("*** RETRIEVED USER ID");


          // Use a snapshot query for initial map setup since it returns instantly
          const snapshotSubscription = this.afs
            .collection<Tag>("Tags")
            .ref.where("uid", "array-contains", uid)
            .where("tagattached", "==", true)
            .orderBy("lastseen", "desc")
            .onSnapshot(
              (data) => {
                // if (this.tagInfo.length === 0) {
                //   this.tagInfo = data.docs;
                // }
                this.updateMapView(data);

                snapshotSubscription();

                // Make sure invite box is positioned at the bottom of the map
                try {
                  document.getElementById(`community`).style.bottom = "10%";
                } catch (e) {
                  console.error(JSON.stringify(e));
                }
              },
              (error) => {
                console.error("onSnapshot Error: " + error);
              }
            );

          // Initialize map markers after pet markers have been added for quicker loading times
          // XXX FIXME: Changing tabs while markers are being added apparently kills the map

          /*
          setTimeout(() => {
            // Add persistent map markers (sensors/pet friendly)
            this.addPersistentMarkers();
            this.addFixedSensorMarkers();

            // Add expiring markers
            this.addExpiringMarkers("police");
            this.addExpiringMarkers("hazard");
            this.addExpiringMarkers("crowded");

            // Add home address marker
            this.authProvider
              .getAccountInfo(false)
              .then((account) => {
                if (account.address_coords) {
                  this.markerProvider.addHomeMarker(account.address_coords);
                }
              })
              .catch((error) => {
                console.error(error);
              });
          }, 1000);
          */

          // Get observable for list and map views

          // Show lost pet markers from the last 45 days
          var beginningDate = Date.now() - 3907200000; // 45 days in milliseconds
          var beginningDateObject = new Date(beginningDate);

          // Check to see if any of our pets are missing
          /*
          this.afs
            .collection<Tag>("Tags", ref =>
              ref
                .where("uid", "array-contains", uid)
                .where("tagattached", "==", true)
                .where("lost", "<", false)
            )
            .valueChanges()
            .pipe(
              catchError(e => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            )
            .subscribe(
              r => {
                console.warn("Lost Mode Detection", JSON.stringify(r));

                if (r.length > 0) {
                  this.lost_pet_mode = true;
                } else {
                  this.lost_pet_mode = false;
                }
              },
              e => {
                console.error("Lost Mode Detection", e.toString());
              }
            );
              */

          this.map$ = this.afs
            .collection<Tag>(
              "Tags",
              (ref) =>
                ref
                  .where("uid", "array-contains", uid)
                  .where("tagattached", "==", true) //.orderBy('tagId', 'desc')
            )
            .valueChanges()
            .pipe(
              catchError((e) => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            );

          // See if any of our pets are lost, enable/disable lost pet mode
          this.map$.subscribe((tags) => {
            let lost = 0;
            this.lost_pets = [];

            tags.forEach((tag) => {
              if (tag.lost != false) {
                lost++;
                this.lost_pets.push(tag);
              }
            });

            if (lost > 0) {
              this.lost_pet_mode = true;
            } else {
              this.lost_pet_mode = false;
              this.lost_pets = [];
            }
          });

          // Display lost markers from the last month
          try {
            this.map_lost$ = this.afs
              .collection<Tag>("Tags", (ref) =>
                ref
                  .where("lost", "==", true)
                  .where("tagattached", "==", true)
                  .where("markedlost", ">", beginningDateObject)
              )
              .valueChanges()
              .pipe(
                catchError((e) => observableThrowError(e)),
                retry(2),
                takeUntil(this.destroyed$)
              );
          } catch (e) {
            console.error("map_lost$", JSON.stringify(e));
          }

          this.map_seen$ = this.afs
            .collection<Tag>("Tags", (ref) =>
              ref
                .where("lost", "==", "seen")
                .where("tagattached", "==", true)
                .where("markedlost", ">", beginningDateObject)
            )
            .valueChanges()
            .pipe(
              catchError((e) => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            );

          this.tag$ = merge(this.map$);
          this.tags_lost$ = merge(this.map_seen$);

          this.map_lost$
            .pipe(
              takeUntil(this.destroyed$),
              catchError((error) => observableThrowError(error))
            )
            .subscribe(
              (data) => {
                data.forEach((tag) => {
                  this.tagInfo[tag.tagId] = tag;
                  this.adjustInfoWindowPosition(tag);

                  // console.error(
                  //   this.platform.width(),
                  //   tag.lost ? 'lost' : 'not lost',
                  //   tag.uid.includes(uid) ? 'mine' : 'not mine'
                  // );

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == "seen")
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>("Tags")
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map((a) => {
                            const data = a.payload.data({
                              serverTimestamps: "previous",
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe((t) => {
                          lost_sub.unsubscribe();

                          if (t.lost === false) {
                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = "hidden";

                              console.error(
                                "##### REMOVING TAG FROM TAGINFO",
                                t
                              );
                              this.tagInfo.splice(
                                this.tagInfo.indexOf(t.tagId),
                                1
                              );
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === "Map") {
                    this.updateMapView(data);
                  }
                }
              },
              (error) => {
                console.error("tags_lost$: " + error);
              }
            );

          this.map_seen$
            .pipe(
              takeUntil(this.destroyed$),
              catchError((error) => observableThrowError(error))
            )
            .subscribe(
              (data) => {
                data.forEach((tag) => {
                  this.tagInfo[tag.tagId] = tag;

                  // console.error(
                  //   this.platform.width(),
                  //   tag.lost ? "lost" : "not lost",
                  //   tag.uid.includes(uid) ? "mine" : "not mine"
                  // );

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == "seen")
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>("Tags")
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map((a) => {
                            const data = a.payload.data({
                              serverTimestamps: "previous",
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe((t) => {
                          lost_sub.unsubscribe();

                          if (t.lost === false) {
                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = "hidden";

                              console.error(
                                "##### REMOVING TAG FROM TAGINFO",
                                t
                              );
                              this.tagInfo.splice(
                                this.tagInfo.indexOf(t.tagId),
                                1
                              );
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === "Map") {
                    this.updateMapView(data);
                  }
                }
              },
              (error) => {
                console.error("tags_lost$: " + error);
              }
            );

          // Continuous map updates
          const subscription = this.map$
            .pipe(
              throttleTime(5000),
              takeUntil(this.destroyed$),
              catchError((error) => observableThrowError(error))
            )
            .subscribe(
              (data) => {
                // this.tagInfo = data;

                console.error(
                  this.platform.width(),
                  "this.tagInfo.length",
                  this.tagInfo.length
                );

                data.forEach((tag) => {
                  this.tagInfo[tag.tagId] = tag;

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == "seen")
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>("Tags")
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map((a) => {
                            const data = a.payload.data({
                              serverTimestamps: "previous",
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe((t) => {
                          lost_sub.unsubscribe();

                          if (t.lost === false) {
                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = "hidden";
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = "hidden";

                              console.error(
                                "##### REMOVING TAG FROM TAGINFO",
                                t
                              );
                              this.tagInfo.splice(this.tagInfo.indexOf(t), 1);
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === "Map") {
                    this.updateMapView(data);
                  }
                }
              },
              (error) => {
                console.error("map$: " + error);
              }
            );

          // Space out markers when zooming in
          var mapZoom;
          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.CAMERA_MOVE)
            .pipe(catchError((error) => observableThrowError(error)))
            .subscribe(
              (event) => {
                const zoom = event[0].zoom;

                if (zoom > 17.5 && zoom > mapZoom) {
                  if (this.markerProvider.getLatLngArray().length > 1) {
                    // this.markerProvider.spaceOutMarkers(zoom * 2);
                  }
                }

                mapZoom = zoom;
              },
              (error) => {
                console.error("Space out markers: " + JSON.stringify(error));
              }
            );

          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.MAP_DRAG)
            .pipe(catchError((error) => observableThrowError(error)))
            .subscribe(
              (event) => {
                this.adjustAllInfoWindows();
              },
              (error) => {
                console.error(" " + JSON.stringify(error));
              }
            );

          this.subscription.add(subscription);
        });
      })
      .catch((e) => {
        console.error(e);
      });

    if (this.platform.is("ios")) {
      setTimeout(() => {
        // Add live map markers
        this.setupLiveMap();
      }, 2000);
    }
  }

  updateMapView(tags) {
    var latlngArray = [];
    var index = 0;

    console.log(
      "****************************** Updating tag ******************************"
    );

    // if (tags.length == 0) {
    //   this.splashscreen.hide();
    // }

    this.number_of_tags = this.BLE.getNumberOfTags();
    this.number_of_markers = tags.length;

    tags.forEach((tagItem) => {
      index++;

      var tag;
      if (typeof tagItem.data === "function") {
        tag = tagItem.data();
      } else {
        tag = tagItem;
      }

      // console.log(JSON.stringify(tag));

      var locStr = tag.location.toString().split(",");
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      if (
        latlng.lat &&
        latlng.lng &&
        tag.location.toString().length > 0 &&
        tag.tagattached
      ) {
        if (!this.markerProvider.exists(tag.tagId)) {
          console.log("Adding marker for " + tag.name);

          this.authProvider.getUserId().then((uid) => {
            var mine: boolean = true;

            if (!tag.uid.includes(uid)) {
              mine = false;
            }

            this.imageLoader
              .preload(tag.img)
              .then((r) => {
                // console.log("Preloading", tag.img, r);
              })
              .catch((e) => {
                console.error("Preload", JSON.stringify(e));
              });

            this.markerProvider
              .addPetMarker(tag, mine)
              .then((marker) => {
                this.showInfoWindows(tag);

                // XXX Do not show radius circle for now
                // if (!tag.lost) {
                //   if (this.protection_radius > 0) {
                //     var circle = this.markerProvider.getMap().addCircle({
                //       center: marker.getPosition(),
                //       radius: this.protection_radius * 1600,
                //       fillColor: 'rgba(105, 182, 185, 0.50)',
                //       strokeColor: 'rgba(167, 230, 215, 0.25)',
                //       strokeWidth: 1
                //     });
                //     marker.bindTo('position', circle, 'center');
                //   }
                // }
              })
              .catch((e) => {
                console.error("addPetMarker", e);
              });
          });

          // XXX FIXME:
          latlngArray.push(latlng);

          // Center the camera on the first marker
          if (index == 1 && !tag.lost) {
            setTimeout(() => {
              try {
                this.markerProvider.getMap().animateCamera({
                  target: latlng,
                  zoom: 12,
                  duration: 50,
                });
              } catch (e) {
                console.error(e);
              }
            }, 100);

            this.adjustInfoWindowPosition(tag);
          }
        } else if (this.markerProvider.isValid(tag.tagId)) {
          console.log(
            "Adjusting marker position for " + tag.name,
            JSON.stringify(latlng)
          );
          try {
            this.markerProvider.getMarker(tag.tagId).setPosition(latlng);
            if (this.markerProvider.isShowingSingleMarker()) {
              if (
                this.markerProvider.getSingleMarkerTagId() == tag.tagId &&
                this.followSingleMarker
              ) {
                this.markerProvider.getMap().animateCamera({
                  target: latlng,
                  duration: 50,
                });
              }
            }
            this.adjustInfoWindowPosition(tag);

            var marker_subscriptions = this.markerProvider.getMarkerSubscriptions();
            if (marker_subscriptions[tag.tagId]) {
              marker_subscriptions[tag.tagId].unsubscribe();
            }

            marker_subscriptions[tag.tagId] = this.markerProvider
              .getMarker(tag.tagId)
              .on(GoogleMapsEvent.MARKER_CLICK)
              .subscribe(() => {
                this.mixpanel
                  .track("marker_click")
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                this.markerProvider.markerActions(tag);
              });
          } catch (e) {
            console.error("Can not move marker: " + e);
          }

          try {
            if (this.markerProvider.getMap().getCameraZoom() > 17.5) {
              if (this.markerProvider.getLatLngArray().length > 1) {
                // this.markerProvider.spaceOutMarkers(2000);
              }
            }
          } catch (e) { }
        }
      } else {
        console.error(
          "Illegal marker coordinates",
          tag.tagId,
          JSON.stringify(latlng)
        );
      }
    });

    console.log(
      "****************************** Done Updating ******************************"
    );
  }

  centerMap() {
    this.mixpanel
      .track("center_map")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    if (this.markerProvider.isShowingSingleMarker()) {
      this.markerProvider.centerSingleMarker();
    } else {
      this.showAllPets();
    }

    this.adjustAllInfoWindows();
  }

  showAllPets() {
    this.mixpanel
      .track("show_all_pets")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    if (!this.utils.showExtraUIElements(this.number_of_markers)) {
      this.hideInfoWindow({
        tagId: this.markerProvider.getSingleMarkerTagId(),
      });
    } else {
      this.adjustAllInfoWindows();
    }

    this.markerProvider.showAllMarkers();
  }

  ionViewWillLeave() { }

  ionViewWillEnter() {
    this.markerProvider.resetMap("mainmap");
    this.adjustAllInfoWindows();
  }

  onCameraEvents(cameraPosition) { }

  getListAvatar(image) {
    return this._sanitizer.bypassSecurityTrustResourceUrl(image);
  }

  getBackground(image) {
    return this._sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(rgba(29, 29, 29, 0), rgba(16, 16, 23, 0.5)), url(${image})`
    );
  }

  showInfoPopover(tagId) {
    this.markerProvider.showInfoPopover(tagId);
  }

  showReportPopover(event) {
    let popover = this.popoverCtrl.create(
      "ReportPopoverPage",
      {
        dummy: "",
      },
      {
        enableBackdropDismiss: true,
        showBackdrop: true,
        cssClass: "report-popover",
      }
    );

    popover.onDidDismiss(() => {
      this.markerProvider.resetMap("mainmap");
    });

    popover.present();
  }

  sendInvite() {
    this.mixpanel
      .track("map_info_box_clicked")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.utils.showInviteDialog(
      "Pet Protection",
      "Sharing Huan on Social Media or Inviting friends will improve the network and will make your pets safer."
    );
  }

  trackByTags(index: number, tag: Tag) {
    return tag.img;
  }

  getInfoWindowSubtitle(tag) {
    var now = Date.now();

    try {
      if (tag.lastseen) {
        if (tag.lost || tag.lost === "seen") {
          document.getElementById(
            `info-window${tag.tagId}`
          ).style.backgroundColor = "red";
          return (
            "[MARKED LOST] Was here " +
            this.utils.getLastSeen(tag.lastseen.toDate())
          );
        } else {
          if (!tag.tagattached) {
            document.getElementById(
              `info-window${tag.tagId}`
            ).style.backgroundColor = "gray";
            return "TAG NOT ATTACHED";
          } else if (now - tag.lastseen.toDate() < 60000) {
            document.getElementById(
              `info-window${tag.tagId}`
            ).style.backgroundColor = "#76b852";
            if (tag.rssi < 0) {
              var rssi = Math.abs(tag.rssi);

              if (rssi > 40 && rssi < 59) {
                return "Distance: very close";
              }

              if (rssi > 60 && rssi < 79) {
                return "Distance: close"
              }

              if (rssi > 80) {
                return "Distance: in range";
              }
              // return 120 - Math.abs(tag.rssi);
            } else {
              return "Distance: in range";
            }
          } else {
            document.getElementById(
              `info-window${tag.tagId}`
            ).style.backgroundColor = "orange";
            return "Was here " + this.utils.getLastSeen(tag.lastseen.toDate());
          }
        }
      }
    } catch (e) {
      console.error("getInfoWindowSubtitle", e);
    }
  }

  getMarkedLostSubtitle(tag) {
    return this.utils.getLastSeen(tag.markedlost.toDate());
  }

  adjustAllInfoWindows() {
    if (
      !this.utils.showExtraUIElements(this.number_of_markers) &&
      !this.markerProvider.isShowingSingleMarker()
    ) {
      return;
    }

    try {
      this.tagInfo.forEach((tag) => {
        if (this.markerProvider.getMarker(tag.tagId).isVisible()) {
          this.showInfoWindows(tag);
          this.adjustInfoWindowPosition(tag);
        } else {
          this.hideInfoWindow(tag);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  adjustInfoWindowPosition(tag) {
    if (
      !this.utils.showExtraUIElements(this.number_of_markers) &&
      !this.markerProvider.isShowingSingleMarker()
    ) {
      return;
    }

    this.markerProvider
      .getMarkerLocationOnMap(tag.tagId)
      .then((l) => {
        var top: number = l[1] - 50;
        var left: number = l[0] - 56;

        try {
          if (!tag.lost) {
            // document.getElementById(`info-window${tag.tagId}`).style.top =
            //   top - 100 + "px";
            top -= 100;
          } else {
            // document.getElementById(`info-window${tag.tagId}`).style.top =
            //   top - 120 + "px";
            top -= 120;
          }
          // document.getElementById(`info-window${tag.tagId}`).style.left =
          // left + "px";

          document.getElementById(`info-window${tag.tagId}`).style.transform =
            "translate(" + (left + 100) + "px, " + (top + 100) + "px)";

          // document.getElementById(`shadow${tag.tagId}`).style.top =
          //   top + 90 + "px";
          // document.getElementById(`shadow${tag.tagId}`).style.left =
          //   left + 54 + "px";

          document.getElementById(`shadow${tag.tagId}`).style.transform =
            "translate(" + (left + 65 + 90) + "px, " + (top + 220 + 54) + "px)";

          if (tag.tagattached) {
            document.getElementById(`pulse${tag.tagId}`).style.top =
              top + 175 + "px";
            document.getElementById(`pulse${tag.tagId}`).style.left =
              left + 54 + "px";

            // document.getElementById(`pulse${tag.tagId}`).style.transform =
            //   "translate(" +
            //   (left + 65 + 90) +
            //   "px, " +
            //   (top + 220 + 54) +
            //   "px)";
            // document.getElementById(`pulse${tag.tagId}`).style.transform =
            //   "rotateX(75deg)";
          } else {
            document.getElementById(`pulse${tag.tagId}`).style.visibility =
              "hidden";
          }
        } catch (e) {
          console.error("adjustInfoWindowPosition", JSON.stringify(e));
        }
      })
      .catch((e) => {
        console.error("getMarkerLocationOnMap", JSON.stringify(e));
      });
  }

  hideInfoWindows() {
    if (
      !this.utils.showExtraUIElements(this.number_of_markers) &&
      !this.markerProvider.isShowingSingleMarker()
    ) {
      return;
    }

    this.tagInfo.forEach((tag) => {
      try {
        document.getElementById(`info-window${tag.tagId}`).style.visibility =
          "hidden";

        document.getElementById(`shadow${tag.tagId}`).style.visibility =
          "hidden";
        document.getElementById(`pulse${tag.tagId}`).style.visibility =
          "hidden";
      } catch (e) {
        console.error("hideInfoWindows", JSON.stringify(e));
      }
    });
  }

  hideInfoWindow(tag) {
    if (
      !this.utils.showExtraUIElements(this.number_of_markers) &&
      !this.markerProvider.isShowingSingleMarker()
    ) {
      return;
    }

    try {
      document.getElementById(`info-window${tag.tagId}`).style.visibility =
        "hidden";

      document.getElementById(`shadow${tag.tagId}`).style.visibility = "hidden";
      document.getElementById(`pulse${tag.tagId}`).style.visibility = "hidden";
    } catch (e) {
      console.error("hideInfoWindows", JSON.stringify(e));
    }
  }

  showInfoWindows(tag) {
    if (
      !this.utils.showExtraUIElements(this.number_of_markers) &&
      !this.markerProvider.isShowingSingleMarker()
    ) {
      return;
    }

    if (tag.location.toString().length > 0 && tag.lastseenBy.length > 0) {
      this.adjustInfoWindowPosition(tag);

      try {
        document.getElementById(`info-window${tag.tagId}`).style.visibility =
          "visible";

        document.getElementById(`shadow${tag.tagId}`).style.zIndex = "-1";

        document.getElementById(`shadow${tag.tagId}`).style.visibility =
          "visible";

        document.getElementById(`pulse${tag.tagId}`).style.visibility =
          "visible";
      } catch (e) {
        console.error("showInfoWindows", JSON.stringify(e));
      }
    }
  }

  openLocationSettings() {
    console.log("Opening app settings");

    if (this.platform.is("ios")) {
      this.iab.create("app-settings://", "_system");
    }
  }

  showLeaderboard() {
    let popover = this.popoverCtrl.create(
      "LeaderboardPage",
      {
        dummy: "",
      },
      {
        enableBackdropDismiss: true,
        // showBackdrop: true,
        cssClass: "leaderboard-popover",
      }
    );

    // popover.onDidDismiss(() => {
    //   this.markerProvider.resetMap('mainmap');
    // });

    popover.present();
  }

  showUpgradeModal() {
    const modal = this.modalCtrl.create(UpgradePage);
    modal.present();
  }

  shareLostPet() {
    this.lost_pets.forEach((tag) => {
      this.utils.share(
        `${tag.name} is missing! Please join Huan and help me find ${tag.gender == "Male" ? "him" : "her"
        }!`,
        `${tag.name} is missing!`,
        tag.alert_post_url
          ? tag.alert_post_url
          : "https://fetch.gethuan.com/mobile",
        "Share Huan"
      );
    });
  }

  ngOnDestroy() {
    console.log("Destroying home view");

    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.markerProvider.destroy();
    // if (this.subscription !== undefined) {
    this.subscription.unsubscribe();
    // }

    // if (this.map !== undefined) {
    //   this.map
    //     .remove()
    //     .then(data => {
    //       console.log('Removed map: ' + data);
    //     })
    //     .catch(error => {
    //       console.error('Unable to remove map: ' + error);
    //     });
    // }
  }
}
