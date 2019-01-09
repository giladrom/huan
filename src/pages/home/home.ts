import {
  throwError as observableThrowError,
  Observable,
  Subscription,
  SubscriptionLike as ISubscription,
  ReplaySubject,
  Subject,
  merge
} from 'rxjs';

import { retry, takeUntil, catchError, sample, map } from 'rxjs/operators';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { Component, ElementRef, OnDestroy } from '@angular/core';
import {
  NavController,
  AlertController,
  Platform,
  PopoverController,
  IonicPage,
  Nav
} from 'ionic-angular';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { UtilsProvider } from '../../providers/utils/utils';

import 'firebase/storage';

import { Tag } from '../../providers/tag/tag';

import { AngularFireAuth } from 'angularfire2/auth';

import { DomSanitizer } from '@angular/platform-browser';
import { ViewChild } from '@angular/core';
import { Slides } from 'ionic-angular';

// Google Maps API
import {
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMaps
} from '@ionic-native/google-maps';
import { LocationProvider } from '../../providers/location/location';

import { SettingsProvider } from '../../providers/settings/settings';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';
import {
  NotificationProvider,
  Notification
} from '../../providers/notification/notification';

// import 'rxjs';

import { AuthProvider } from '../../providers/auth/auth';
import { BleProvider } from '../../providers/ble/ble';
import { Toast } from '@ionic-native/toast';

import moment from 'moment';

// Define App State
enum AppState {
  APP_STATE_FOREGROUND,
  APP_STATE_BACKGROUND
}

@IonicPage({ priority: 'high' })
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
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

  viewMode: any;
  private townName = {};

  public myPhotosRef: any;
  @ViewChild(Slides)
  slides: Slides;

  @ViewChild('mainmap')
  mapElement: ElementRef;
  @ViewChild('canvas')
  canvas: ElementRef;
  @ViewChild('navbutton')
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

  // Runtime errors
  private bluetooth;
  private auth;
  private phone_number_missing = false;
  private address_missing = false;
  private monitoring_enabled = false;

  // App state

  private state = AppState.APP_STATE_FOREGROUND;

  // Area/invite overlay box variables
  private communityString;
  private areaCovered;
  private usersInvited;
  private levelBanner;
  private units;
  private rank;
  private progress = 0;

  private number_of_tags = 0;

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
    private notificationProvider: NotificationProvider,
    private BLE: BleProvider,
    private toast: Toast
  ) {
    this.notification$ = new Subject<Notification[]>();

    this.viewMode = 'map';

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');

    this.update$ = new Subject<any>();

    // Update map when we are back in foreground mode
    this.platform.resume.subscribe(e => {
      console.log('### Resumed foreground mode');
      this.state = AppState.APP_STATE_FOREGROUND;

      // Set BLE DB update interval to 2 sec when back in foreground mode
      this.BLE.setUpdateInterval(2000);

      if (this.tagInfo.length > 0) {
        if (this.navCtrl.parent.getSelected().tabTitle === 'Map') {
          // Remove obsolete tags from tagInfo
          this.tagInfo.forEach((t, i) => {
            if (!this.markerProvider.exists(t.tagId)) {
              console.info('### Removing tag from tagInfo', t.tagId, t.name);
              this.tagInfo.splice(i, 1);
            }
          });

          this.updateMapView(this.tagInfo);
        }
      }
    });

    // Set background mode
    this.platform.pause.subscribe(() => {
      console.log('### Entered Background mode');
      this.state = AppState.APP_STATE_BACKGROUND;

      // Set BLE DB update interval
      this.BLE.setUpdateInterval(15000);
    });

    // Listen for bluetooth status and enable warning display
    this.platform.ready().then(() => {
      this.BLE.getBluetoothStatus().subscribe(status => {
        this.bluetooth = status;
      });

      this.BLE.getAuthStatus().subscribe(status => {
        this.auth = status;
      });

      this.settings
        .getSettings()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(settings => {
          if (settings) {
            this.monitoring_enabled = settings.enableMonitoring;
          }
        });
    });
  }

  addTag() {
    this.navCtrl.parent.parent.push('AddPage');
  }

  showTag(tagItem) {
    this.navCtrl.push('ShowPage', tagItem);
  }

  addExpiringMarkers(type) {
    this.afs
      .collection<Tag>('Reports', ref =>
        ref
          .where('timestamp', '>=', Date.now() - 60 * 30 * 1000)
          .where('report', '==', type)
      )
      .stateChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe(report => {
        report.forEach(r => {
          this.markerProvider
            .addReportMarker(r)
            .then(marker => {
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
                'Setting deletion timer to ' + time_to_live_ms + 'ms'
              );

              setTimeout(() => {
                console.log('Deleting marker ' + r.id);

                this.markerProvider.deleteMarker(r.id);
              }, time_to_live_ms);

              // console.log('Added expiring marker for report type ' + type);
            })
            .catch(e => {
              console.error(
                'addExpiringMarkers: Unable to add marker: ' + JSON.stringify(e)
              );
            });
        });
      });
  }

  addPersistentMarkers() {
    this.afs
      .collection<Tag>('Reports', ref =>
        ref
          .where('report', '==', 'pet_friendly')
          .where('timestamp', '>=', Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
      .stateChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe(report => {
        report.forEach(r => {
          this.locationProvider
            .getLocationObject()
            .then(l => {
              var locStr = r.location.toString().split(',');
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
                  .then(marker => {
                    // console.log('Added persistent marker for report type ' + type);
                  })
                  .catch(e => {
                    console.error(
                      'addPersistentMarkers: Unable to add marker: ' +
                        JSON.stringify(e)
                    );
                  });
              }
            })
            .catch(e => {
              console.error('Location unavailable: ' + e);
            });
        });
      });
  }

  addSensorMarkers() {
    this.afs
      .collection('Nodes')
      .stateChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe(sensors => {
        sensors.forEach(sensor => {
          this.locationProvider
            .getLocationObject()
            .then(l => {
              var locStr = sensor.location.toString().split(',');
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
                  .addSensorMarker(latlng)
                  .then(marker => {
                    // console.log('Added persistent marker for report type ' + type);
                  })
                  .catch(e => {
                    console.error(
                      'addSensorMarkers: Unable to add marker: ' +
                        JSON.stringify(e)
                    );
                  });
              }
            })
            .catch(e => {
              console.error('addSensorMarkers: Location unavailable: ' + e);
            });
        });
      });
  }

  ionViewDidEnter() {
    console.log(' *********************** ');
    console.log('     ionViewDidEnter     ');
    console.log(' *********************** ');

    this.created$.next(true);
    this.created$.complete();

    // Set BLE DB update interval to 2 sec when map is in view
    this.BLE.setUpdateInterval(2000);

    // this.locationProvider
    //   .getCommunityId(true)
    //   .then(community => {
    //     this.communityString = `${community}`;
    //   })
    //   .catch(e => {
    //     console.error(e);
    //   });

    // Display welcome popover on first login

    this.updateBanner()
      .then(r => {
        console.log('updateBanner', r);
      })
      .catch(e => {
        console.error('updateBanner', e);
      });

    this.markerProvider.resetMap('mainmap');
  }

  ionViewDidLeave() {
    this.BLE.setUpdateInterval(15000);
  }

  updateBanner() {
    return new Promise((resolve, reject) => {
      this.utils
        .getCurrentScore('invite')
        .then(s => {
          console.log('Updating Banner text', s);

          var score: number = Number(s);

          this.levelBanner = `${score} invite(s) sent`;

          // if (score < 3) {
          //   this.progress = score * 33;
          //   this.levelBanner = 3 - score + ' invites needed to get tags!';
          // } else if (score >= 3) {
          //   this.progress = 100;

          //   this.levelBanner = `${score} invite(s) sent`;
          // }

          resolve(s);
        })
        .catch(e => {
          console.error('upateBanner', e);
          reject(e);
        });
    });
  }

  ionViewDidLoad() {
    // Actions that only need to be taken once the main map is in view for the first time
    this.created$.subscribe(() => {
      this.initializeMapView();
    });

    this.updateBanner()
      .then(r => {
        console.log('updateBanner', r);
      })
      .catch(e => {
        console.error('updateBanner', e);
      });

    this.settings
      .getSettings()
      .pipe(takeUntil(this.sub))
      .subscribe(settings => {
        if (settings) {
          this.sub.next(true);
          this.sub.complete();

          if (settings.showWelcome === true) {
            console.log('Displaying welcome popover');

            // let popover = this.popoverCtrl.create(
            //   'GetStartedPopoverPage',
            //   {},
            //   {
            //     enableBackdropDismiss: true,
            //     cssClass: 'get-started-popover'
            //   }
            // );
            // popover.present();
            this.showGetStartedPopover();

            this.settings.setShowWelcome(false);
          } else {
            // Add warnings if owner info is missing
            this.authProvider
              .getAccountInfo(false)
              .then(account => {
                // account.takeUntil(this.destroyed$).subscribe(account => {
                if (account !== undefined) {
                  if (!account.phoneNumber || !account.address) {
                    this.phone_number_missing = true;
                    this.toast
                      .showWithOptions({
                        message:
                          'WARNING: Owner Info Missing! Please set owner info in "My Account" page.',
                        duration: 7000,
                        position: 'center'
                        // addPixelsY: 120
                      })
                      .subscribe(toast => {
                        console.log(JSON.stringify(toast));

                        if (toast && toast.event) {
                          if (toast.event === 'touch') {
                            this.navCtrl.parent.parent.push('AccountPage');
                          }
                        }
                      });
                  }
                }
                // });
              })
              .catch(error => {
                console.error(error);
              });
          }
        }
      });
  }

  showGetStartedPopover() {
    let alertBox = this.alertCtrl.create({
      title: 'Welcome!',
      message: "Let's get started. Click below to add your first pet.",
      buttons: [
        {
          text: 'Not Now',
          handler: () => {}
        },
        {
          text: 'Add Pet!',
          handler: () => {
            this.addTag();
          }
        }
      ],
      cssClass: 'alertclass'
    });

    alertBox
      .present()
      .then(() => {
        this.markerProvider.resetMap('mainmap');
      })
      .catch(e => {
        console.error('showGetStartedPopover: ' + JSON.stringify(e));
      });
  }

  initializeMapView() {
    this.destroyed$ = new ReplaySubject(1);

    console.log(' *********************** ');
    console.log('     initializeMapView   ');
    console.log(' *********************** ');

    this.platform.ready().then(() => {
      this.locationProvider
        .getLocationObject()
        .then(current_location => {
          this.setupMapView(current_location);
        })
        .catch(e => {
          console.error(
            'initializeMapView(): Unable to get current location' +
              JSON.stringify(e)
          );

          this.setupMapView(null);
        });
    });
  }

  setupMapView(location_object) {
    this.markerProvider
      .init('mainmap', location_object)
      .then(() => {
        // this.splashscreen.hide();

        // Return tags for display, filter by uid
        this.authProvider.getUserId().then(uid => {
          console.log('*** RETRIEVED USER ID');

          // Use a snapshot query for initial map setup since it returns instantly
          const snapshotSubscription = this.afs
            .collection<Tag>('Tags')
            .ref.where('uid', 'array-contains', uid)
            .orderBy('lastseen', 'desc')
            .onSnapshot(
              data => {
                // if (this.tagInfo.length === 0) {
                //   this.tagInfo = data.docs;
                // }
                this.updateMapView(data);

                snapshotSubscription();

                // Make sure invite box is positioned at the bottom of the map
                // if (this.tagInfo.length > 0) {
                document.getElementById(`community`).style.bottom = '10%';
                // }
              },
              error => {
                console.error('onSnapshot Error: ' + JSON.stringify(error));
              }
            );

          // Initialize map markers after pet markers have been added for quicker loading times
          // XXX FIXME: Changing tabs while markers are being added apparently kills the map

          setTimeout(() => {
            // Add persistent map markers (sensors/pet friendly)
            this.addPersistentMarkers();
            this.addSensorMarkers();

            // Add expiring markers
            this.addExpiringMarkers('police');
            this.addExpiringMarkers('hazard');
            this.addExpiringMarkers('crowded');

            // Add home address marker
            this.authProvider
              .getAccountInfo(false)
              .then(account => {
                if (account.address_coords) {
                  this.markerProvider.addHomeMarker(account.address_coords);
                }
              })
              .catch(error => {
                console.error(error);
              });
          }, 1000);

          // Get observable for list and map views
          this.map$ = this.afs
            .collection<Tag>(
              'Tags',
              ref => ref.where('uid', 'array-contains', uid) //.orderBy('tagId', 'desc')
            )
            .valueChanges()
            .pipe(
              catchError(e => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            );

          this.map_lost$ = this.afs
            .collection<Tag>('Tags', ref =>
              ref.where('lost', '==', 'true').where('tagattached', '==', true)
            )
            .valueChanges()
            .pipe(
              catchError(e => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            );

          this.map_seen$ = this.afs
            .collection<Tag>('Tags', ref =>
              ref.where('lost', '==', 'seen').where('tagattached', '==', true)
            )
            .valueChanges()
            .pipe(
              catchError(e => observableThrowError(e)),
              retry(2),
              takeUntil(this.destroyed$)
            );

          this.tag$ = merge(this.map$);
          this.tags_lost$ = merge(this.map_seen$);

          this.map_lost$
            .pipe(
              takeUntil(this.destroyed$),
              catchError(error => observableThrowError(error))
            )
            .subscribe(
              data => {
                data.forEach(tag => {
                  this.tagInfo[tag.tagId] = tag;
                  this.adjustInfoWindowPosition(tag);

                  console.error(
                    this.platform.width(),
                    tag.lost ? 'lost' : 'not lost',
                    tag.uid.includes(uid) ? 'mine' : 'not mine'
                  );

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == 'seen')
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>('Tags')
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map(a => {
                            const data = a.payload.data({
                              serverTimestamps: 'previous'
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe(t => {
                          if (t.lost === false) {
                            lost_sub.unsubscribe();

                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = 'hidden';

                              console.error(
                                '##### REMOVING TAG FROM TAGINFO',
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

                          console.error(
                            'INSIDE SUBSCRIPTION',
                            this.platform.width(),
                            t.tagId,
                            t.lost
                          );
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === 'Map') {
                    this.updateMapView(data);
                  }
                }
              },
              error => {
                this.utils.displayAlert(error);
                console.error('tags_lost$: ' + JSON.stringify(error));
              }
            );

          this.map_seen$
            .pipe(
              takeUntil(this.destroyed$),
              catchError(error => observableThrowError(error))
            )
            .subscribe(
              data => {
                data.forEach(tag => {
                  this.tagInfo[tag.tagId] = tag;

                  console.error(
                    this.platform.width(),
                    tag.lost ? 'lost' : 'not lost',
                    tag.uid.includes(uid) ? 'mine' : 'not mine'
                  );

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == 'seen')
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>('Tags')
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map(a => {
                            const data = a.payload.data({
                              serverTimestamps: 'previous'
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe(t => {
                          if (t.lost === false) {
                            lost_sub.unsubscribe();

                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = 'hidden';

                              console.error(
                                '##### REMOVING TAG FROM TAGINFO',
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

                          console.error(
                            'INSIDE SUBSCRIPTION',
                            this.platform.width(),
                            t.tagId,
                            t.lost
                          );
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === 'Map') {
                    this.updateMapView(data);
                  }
                }
              },
              error => {
                this.utils.displayAlert(error);
                console.error('tags_lost$: ' + JSON.stringify(error));
              }
            );

          // Continuous map updates
          const subscription = this.map$
            .pipe(
              takeUntil(this.destroyed$),
              catchError(error => observableThrowError(error))
            )
            .subscribe(
              data => {
                // this.tagInfo = data;

                console.error(
                  this.platform.width(),
                  'this.tagInfo.length',
                  this.tagInfo.length
                );

                data.forEach(tag => {
                  this.tagInfo[tag.tagId] = tag;

                  console.error(
                    this.platform.width(),
                    tag.lost ? 'lost' : 'not lost',
                    tag.uid.includes(uid) ? 'mine' : 'not mine'
                  );

                  // Find out newly missing tags which don't belong to us, and monitor them for state changes
                  // so we can remove them from our map when they're not lost anymore
                  if (
                    !tag.uid.includes(uid) &&
                    (tag.lost || <any>tag.lost == 'seen')
                  ) {
                    const lost_sub: Subscription = new Subscription();

                    lost_sub.add(
                      this.afs
                        .collection<Tag>('Tags')
                        .doc(tag.tagId)
                        .snapshotChanges()
                        .pipe(
                          map(a => {
                            const data = a.payload.data({
                              serverTimestamps: 'previous'
                            }) as Tag;
                            const id = a.payload.id;
                            return { id, ...data };
                          })
                        )
                        .subscribe(t => {
                          if (t.lost === false) {
                            lost_sub.unsubscribe();

                            try {
                              this.markerProvider.deleteMarker(t.tagId);
                              document.getElementById(
                                `shadow${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `pulse${t.tagId}`
                              ).style.visibility = 'hidden';
                              document.getElementById(
                                `info-window${t.tagId}`
                              ).style.visibility = 'hidden';

                              console.error(
                                '##### REMOVING TAG FROM TAGINFO',
                                t
                              );
                              this.tagInfo.splice(this.tagInfo.indexOf(t), 1);
                            } catch (e) {
                              console.error(e);
                            }
                          }

                          console.error(
                            'INSIDE SUBSCRIPTION',
                            this.platform.width(),
                            t.tagId,
                            t.lost
                          );
                        })
                    );
                  }
                });

                if (this.state == AppState.APP_STATE_FOREGROUND) {
                  if (this.navCtrl.parent.getSelected().tabTitle === 'Map') {
                    this.updateMapView(data);
                  }
                }
              },
              error => {
                this.utils.displayAlert(error);
                console.error('map$: ' + JSON.stringify(error));
              }
            );

          // Space out markers when zooming in
          var mapZoom;
          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.CAMERA_MOVE)
            .pipe(catchError(error => observableThrowError(error)))
            .subscribe(
              event => {
                const zoom = event[0].zoom;

                if (zoom > 17.5 && zoom > mapZoom) {
                  if (this.markerProvider.getLatLngArray().length > 1) {
                    // this.markerProvider.spaceOutMarkers(zoom * 2);
                  }
                }

                mapZoom = zoom;
              },
              error => {
                console.error('Space out markers: ' + JSON.stringify(error));
              }
            );

          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.CAMERA_MOVE_START)
            .pipe(catchError(error => observableThrowError(error)))
            .subscribe(
              event => {
                console.log('CAMERA_MOVE_START');

                this.hideInfoWindows();
              },
              error => {
                console.error(' ' + JSON.stringify(error));
              }
            );

          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.CAMERA_MOVE_END)
            .pipe(catchError(error => observableThrowError(error)))
            .subscribe(
              event => {
                console.log('CAMERA_MOVE_END');

                this.showInfoWindows();
              },
              error => {
                console.error(' ' + JSON.stringify(error));
              }
            );

          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.MAP_DRAG_START)
            .pipe(catchError(error => observableThrowError(error)))
            .subscribe(
              event => {
                console.log('MAP_DRAG_START');

                this.hideInfoWindows();
              },
              error => {
                console.error(' ' + JSON.stringify(error));
              }
            );

          this.markerProvider
            .getMap()
            .on(GoogleMapsEvent.MAP_DRAG_END)
            .pipe(catchError(error => observableThrowError(error)))

            .subscribe(
              event => {
                console.log('MAP_DRAG_END');

                this.showInfoWindows();
              },
              error => {
                console.error(' ' + JSON.stringify(error));
              }
            );
          this.subscription.add(subscription);
        });
      })
      .catch(e => {
        console.error(e);
      });
  }

  updateMapView(tags) {
    var latlngArray = [];
    var index = 0;

    console.log(
      '****************************** Updating tag ******************************'
    );

    if (tags.length == 0) {
      this.splashscreen.hide();
    }

    this.number_of_tags = this.BLE.getNumberOfTags();

    tags.forEach(tagItem => {
      index++;

      var tag;
      if (typeof tagItem.data === 'function') {
        tag = tagItem.data();
      } else {
        tag = tagItem;
      }

      var locStr = tag.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      if (latlng.lat && latlng.lng && tag.location.toString().length > 0) {
        if (!this.markerProvider.exists(tag.tagId)) {
          console.log('Adding marker for ' + tag.name);

          this.authProvider.getUserId().then(uid => {
            var mine: boolean = true;

            if (!tag.uid.includes(uid)) {
              mine = false;
            }

            this.markerProvider
              .addPetMarker(tag, mine)
              .then(() => {
                // this.showInfoWindows();
                this.adjustInfoWindowPosition(tag);
              })
              .catch(e => {
                console.error(e);
              });
          });

          // XXX FIXME:
          latlngArray.push(latlng);

          // Center the camera on the first marker
          if (index == 1 && !tag.lost) {
            // setTimeout(() => {
            try {
              this.markerProvider.getMap().animateCamera({
                target: latlng,
                zoom: 14,
                duration: 50
              });
            } catch (e) {}

            this.splashscreen.hide();
            // }, 1000);
            setTimeout(() => {
              this.adjustInfoWindowPosition(tag);
            }, 1000);
          }
        } else if (this.markerProvider.isValid(tag.tagId)) {
          console.log(
            'Adjusting marker position for ' + tag.name,
            JSON.stringify(latlng)
          );
          try {
            this.markerProvider.getMarker(tag.tagId).setPosition(latlng);
            this.adjustInfoWindowPosition(tag);

            var marker_subscriptions = this.markerProvider.getMarkerSubscriptions();
            if (marker_subscriptions[tag.tagId]) {
              marker_subscriptions[tag.tagId].unsubscribe();
            }

            marker_subscriptions[tag.tagId] = this.markerProvider
              .getMarker(tag.tagId)
              .on(GoogleMapsEvent.MARKER_CLICK)
              .subscribe(() => {
                this.markerProvider.markerActions(tag);
              });
          } catch (e) {
            console.error('Can not move marker: ' + e);
          }

          try {
            if (this.markerProvider.getMap().getCameraZoom() > 17.5) {
              if (this.markerProvider.getLatLngArray().length > 1) {
                // this.markerProvider.spaceOutMarkers(2000);
              }
            }
          } catch (e) {}
        }
      } else {
        console.error('Illegal marker coordinates', JSON.stringify(latlng));
      }
    });

    console.log(
      '****************************** Done Updating ******************************'
    );
  }

  showMyPets() {
    this.hideInfoWindows();
    this.markerProvider.showAllMarkers();
    this.showInfoWindows();
  }

  ionViewWillLeave() {}

  ionViewWillEnter() {
    this.markerProvider.resetMap('mainmap');
  }

  onCameraEvents(cameraPosition) {}

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
      'ReportPopoverPage',
      {
        dummy: ''
      },
      {
        enableBackdropDismiss: true,
        showBackdrop: true,
        cssClass: 'report-popover'
      }
    );

    popover.onDidDismiss(() => {
      this.markerProvider.resetMap('mainmap');
    });

    popover.present();
  }

  sendInvite() {
    // Make sure we send an up-to-date FCM token with our invite
    this.notificationProvider.updateTokens();

    this.authProvider
      .getAccountInfo(false)
      .then(account => {
        this.utils
          .textReferralCode(
            account.displayName,
            this.notificationProvider.getFCMToken()
          )
          .then(r => {
            console.log('sendInvite', r);

            // Wait for 1 second to ensure Branch updated their database
            setTimeout(() => {
              this.updateBanner()
                .then(r => {
                  console.log('updateBanner', r);
                })
                .catch(e => {
                  console.error('updateBanner', e);
                });
            }, 1000);
          })
          .catch(e => {
            console.warn('textReferralCode', e);
          });
      })
      .catch(e => {
        console.error('sendInvite(): ERROR: Unable to get account info!', e);
      });
  }

  trackByTags(index: number, tag: Tag) {
    return tag.img;
  }

  getInfoWindowSubtitle(tag) {
    var now = Date.now();
    if (tag.lastseen) {
      if (tag.lost || tag.lost === 'seen') {
        document.getElementById(
          `info-window${tag.tagId}`
        ).style.backgroundColor = 'red';
        return 'MARKED LOST BY OWNER';
      } else {
        if (!tag.tagattached) {
          document.getElementById(
            `info-window${tag.tagId}`
          ).style.backgroundColor = 'gray';
          return 'TAG NOT ATTACHED';
        } else if (now - tag.lastseen.toDate() < 60000) {
          document.getElementById(
            `info-window${tag.tagId}`
          ).style.backgroundColor = '#76b852';
          return 'JUST SEEN';
        } else {
          document.getElementById(
            `info-window${tag.tagId}`
          ).style.backgroundColor = 'orange';
        }
      }
    }
  }

  getMarkedLostSubtitle(tag) {
    return this.utils.getLastSeen(tag.markedlost.toDate());
  }

  adjustInfoWindowPosition(tag) {
    this.markerProvider
      .getMarkerLocationOnMap(tag.tagId)
      .then(l => {
        console.log('### adjustInfoWindowPosition', JSON.stringify(l));

        var top: number = l[1] - 70;
        var left: number = l[0] - 56;

        try {
          if (!tag.lost) {
            document.getElementById(`info-window${tag.tagId}`).style.top =
              top - 100 + 'px';
          } else {
            document.getElementById(`info-window${tag.tagId}`).style.top =
              top - 120 + 'px';
          }
          document.getElementById(`info-window${tag.tagId}`).style.left =
            left + 'px';

          document.getElementById(`shadow${tag.tagId}`).style.top =
            top + 90 + 'px';
          document.getElementById(`shadow${tag.tagId}`).style.left =
            left + 54 + 'px';

          if (tag.tagattached) {
            document.getElementById(`pulse${tag.tagId}`).style.top =
              top + 90 + 'px';
            document.getElementById(`pulse${tag.tagId}`).style.left =
              left + 54 + 'px';
          } else {
            document.getElementById(`pulse${tag.tagId}`).style.visibility =
              'hidden';
          }
        } catch (e) {
          console.error('adjustInfoWindowPosition', JSON.stringify(e));
        }
      })
      .catch(e => {
        console.error('getMarkerLocationOnMap', JSON.stringify(e));
      });
  }

  hideInfoWindows() {
    this.tagInfo.forEach(tag => {
      console.log('Hiding info window ', tag.tagId);

      try {
        document.getElementById(`info-window${tag.tagId}`).style.visibility =
          'hidden';

        document.getElementById(`shadow${tag.tagId}`).style.visibility =
          'hidden';
        document.getElementById(`pulse${tag.tagId}`).style.visibility =
          'hidden';
      } catch (e) {
        console.error('hideInfoWindows', JSON.stringify(e));
      }
    });
  }

  showInfoWindows() {
    this.tagInfo.forEach(tag => {
      console.log('Showing info window ', tag.tagId);
      if (tag.location.toString().length > 0) {
        this.adjustInfoWindowPosition(tag);

        try {
          document.getElementById(`info-window${tag.tagId}`).style.visibility =
            'visible';

          document.getElementById(`shadow${tag.tagId}`).style.zIndex = '-1';

          document.getElementById(`shadow${tag.tagId}`).style.visibility =
            'visible';

          document.getElementById(`pulse${tag.tagId}`).style.visibility =
            'visible';
        } catch (e) {
          console.error('showInfoWindows', JSON.stringify(e));
        }
      }
    });
  }

  ngOnDestroy() {
    console.log('Destroying home view');

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
