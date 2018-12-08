import {
  throwError as observableThrowError,
  Observable,
  Subscription,
  SubscriptionLike as ISubscription,
  ReplaySubject,
  Subject
} from 'rxjs';

import { retry, takeUntil, catchError, sample, map } from 'rxjs/operators';
import { Component, ElementRef, OnDestroy } from '@angular/core';
import {
  NavController,
  AlertController,
  Platform,
  PopoverController,
  IonicPage
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
  map$: Observable<Tag[]>;

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

  private markerSubscriptions = [];

  // Runtime errors
  private bluetooth;
  private auth;
  private phone_number_missing = false;
  private address_missing = false;
  private monitoring_enabled = false;

  // App state

  private state = AppState.APP_STATE_FOREGROUND;

  // Community
  private communityString;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider,
    private authProvider: AuthProvider,
    // private googleMaps: GoogleMaps,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private locationProvider: LocationProvider,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider,
    private splashscreen: SplashScreen,
    private notificationProvider: NotificationProvider,
    private BLE: BleProvider
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

      // Add warnings if owner info is missing
      this.authProvider
        .getAccountInfo(true)
        .then(account => {
          account.takeUntil(this.destroyed$).subscribe(account => {
            if (account !== undefined) {
              if (account.phoneNumber.length === 0) {
                this.phone_number_missing = true;
              } else {
                this.phone_number_missing = false;
              }

              if (account.address.length === 0) {
                this.address_missing = true;
              } else {
                this.address_missing = false;
              }
            }
          });
        })
        .catch(error => {
          console.error(error);
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

    // Set Location Manager UID for HTTPS requests (Android only)
    //this.BLE.setLocationManagerUid();
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

    // Display welcome popover on first login

    this.markerProvider.resetMap('mainmap');
  }

  ionViewDidLeave() {
    this.BLE.setUpdateInterval(15000);
  }

  ionViewDidLoad() {
    // Actions that only need to be taken once the main map is in view for the first time
    this.created$.subscribe(() => {
      this.locationProvider
        .getCommunityId(true)
        .then(community => {
          this.communityString = `${community} community`;
        })
        .catch(e => {
          console.error(e);
        });

      this.initializeMapView();
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
                this.tagInfo = data.docs;
                this.updateMapView(data);

                snapshotSubscription();
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
                this.markerProvider.addHomeMarker(account.address_coords);
              })
              .catch(error => {
                console.error(error);
              });
          }, 500);

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

          this.tag$ = this.map$.pipe(
            takeUntil(this.destroyed$),
            sample(this.update$.asObservable())
          );

          // Subscribe to the valueChanges() query for continuous map updates
          const subscription = this.map$
            .pipe(
              takeUntil(this.destroyed$),
              catchError(error => observableThrowError(error))
            )
            .subscribe(
              data => {
                this.tagInfo = data;

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
          try {
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
          } catch (e) {
            console.error('getMap(): ' + JSON.stringify(e));
          }

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

      if (!this.markerProvider.exists(tag.tagId)) {
        console.log('Adding marker for ' + tag.name);

        this.markerProvider
          .addMarker(tag)
          .then(marker => {
            this.markerSubscriptions[tag.tagId] = marker
              .on(GoogleMapsEvent.MARKER_CLICK)
              .subscribe(() => {
                this.utils.getDirections(tag.name, tag.location);
              });
          })
          .catch(error => {
            console.error('addMarker() error: ' + error);
          });

        latlngArray.push(latlng);

        // Center the camera on the first marker
        if (index == 1) {
          // setTimeout(() => {
          try {
            this.markerProvider.getMap().animateCamera({
              target: latlng,
              zoom: 17,
              duration: 50
            });
          } catch (e) {}

          this.splashscreen.hide();
          // }, 1000);
        }
      } else if (this.markerProvider.isValid(tag.tagId)) {
        console.log('Adjusting marker position for ' + tag.name);
        try {
          this.markerProvider.getMarker(tag.tagId).setPosition(latlng);

          this.markerSubscriptions[tag.tagId].unsubscribe();

          this.markerSubscriptions[tag.tagId] = this.markerProvider
            .getMarker(tag.tagId)
            .on(GoogleMapsEvent.MARKER_CLICK)
            .subscribe(() => {
              this.utils.getDirections(tag.name, tag.location);
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
    });

    console.log(
      '****************************** Done Updating ******************************'
    );
  }

  showMyPets() {
    this.markerProvider.showAllMarkers();
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
