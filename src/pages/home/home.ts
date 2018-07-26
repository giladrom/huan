import { Component, ElementRef, OnDestroy } from '@angular/core';
import {
  NavController,
  AlertController,
  Platform,
  PopoverController,
  IonicPage,
  Content
} from 'ionic-angular';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';

import { UtilsProvider } from '../../providers/utils/utils';

import 'firebase/storage';

import { Tag } from '../../providers/tag/tag';

import { AngularFireAuth } from 'angularfire2/auth';

import { DomSanitizer } from '@angular/platform-browser';
import { ViewChild } from '@angular/core';
import { Slides } from 'ionic-angular';

// Google Maps API
import {
  GoogleMaps,
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMapsMapTypeId,
  GoogleMapOptions
} from '@ionic-native/google-maps';
import { LocationProvider } from '../../providers/location/location';

import { SettingsProvider } from '../../providers/settings/settings';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';

// The following two imports are required, ignore tslint warning
import { Subscription, ISubscription } from 'rxjs/Subscription';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import {
  NotificationProvider,
  Notification
} from '../../providers/notification/notification';
import { Subject } from 'rxjs/Subject';

import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/sample';
import 'rxjs/add/observable/throw';

// import 'rxjs';
import { AuthProvider } from '../../providers/auth/auth';
import { BleProvider } from '../../providers/ble/ble';

import { Pro } from '@ionic/pro';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';

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
  @ViewChild(Slides) slides: Slides;

  @ViewChild('mainmap') mapElement: ElementRef;
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('navbutton') navButtonElement: ElementRef;

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

      if (this.tagInfo.length > 0) {
        this.updateMapView(this.tagInfo);
      }
    });

    // Set background mode
    this.platform.pause.subscribe(() => {
      console.log('### Entered Background mode');
      this.state = AppState.APP_STATE_BACKGROUND;
    });

    // Listen for bluetooth status and enable warning display
    this.platform.ready().then(() => {
      this.BLE.getBluetoothStatus().subscribe(status => {
        this.bluetooth = status;
      });

      this.locationProvider
        .getCommunityId(true)
        .then(community => {
          this.communityString = `${community} community`;
        })
        .catch(e => {
          console.error(e);
        });
    });
  }

  addTag() {
    this.navCtrl.push('AddPage');
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
      .catch(e => Observable.throw(e))
      .retry(2)
      .takeUntil(this.destroyed$)
      .map(actions =>
        actions.map(a => {
          const data = a.payload.doc.data() as any;
          const id = a.payload.doc.id;
          return { id, ...data };
        })
      )
      .subscribe(report => {
        report.forEach(r => {
          this.markerProvider
            .addReportMarker(r)
            .then(marker => {
              // Automatically remove markers after 30 minutes
              var deletion_timeout: number = r.timestamp + 1000 * 60 * 30;

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

              console.log('Added expiring marker for report type ' + type);
            })
            .catch(e => {
              console.error(
                'addExpiringMarkers: Unable to add marker: ' + JSON.stringify(e)
              );
            });
        });
      });
  }

  addPersistentMarkers(type) {
    this.afs
      .collection<Tag>('Reports', ref =>
        ref.where('report', '==', 'pet_friendly')
      )
      .stateChanges()
      .catch(e => Observable.throw(e))
      .retry(2)
      .takeUntil(this.destroyed$)
      .map(actions =>
        actions.map(a => {
          const data = a.payload.doc.data() as any;
          const id = a.payload.doc.id;
          return { id, ...data };
        })
      )
      .subscribe(report => {
        report.forEach(r => {
          this.markerProvider
            .addReportMarker(r)
            .then(marker => {
              console.log('Added persistent marker for report type ' + type);
            })
            .catch(e => {
              console.error(
                'addPersistentMarkers: Unable to add marker: ' +
                  JSON.stringify(e)
              );
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

    // Display welcome popover on first login
    // FIXME: Firebase caching returns the wrong result on new logins
  }

  ionViewDidLoad() {
    this.created$.subscribe(() => {
      this.initializeMapView();
    });

    this.settings
      .getSettings()
      .takeUntil(this.sub)
      .subscribe(settings => {
        if (settings) {
          this.sub.next(true);
          this.sub.complete();

          if (settings.showWelcome === true) {
            console.log('Displaying welcome popover');

            let popover = this.popoverCtrl.create(
              'GetStartedPopoverPage',
              {},
              {
                enableBackdropDismiss: true,
                cssClass: 'get-started-popover'
              }
            );
            popover.present();

            this.settings.setShowWelcome(false);
          }
        }
      });
  }

  initializeMapView() {
    this.destroyed$ = new ReplaySubject(1);

    console.log(' *********************** ');
    console.log('     initializeMapView   ');
    console.log(' *********************** ');

    this.platform.ready().then(() => {
      this.markerProvider
        .init('mainmap')
        .then(() => {
          // Return tags for display, filter by uid
          this.authProvider.getUserId().then(uid => {
            console.log('*** RETRIEVED USER ID');

            // Get observable for persistent user reports
            this.addPersistentMarkers('pet_friendly');

            // Get observable for expiring user reports
            this.addExpiringMarkers('police');
            this.addExpiringMarkers('hazard');
            this.addExpiringMarkers('crowded');

            // Get observable for list and map views
            this.map$ = this.afs
              .collection<Tag>('Tags', ref =>
                ref.where('uid', '==', uid).orderBy('tagId', 'desc')
              )
              .valueChanges()
              .catch(e => Observable.throw(e))
              .retry(2)
              .takeUntil(this.destroyed$);

            this.tag$ = this.map$
              .takeUntil(this.destroyed$)
              .sample(this.update$.asObservable());

            // Use a snapshot query for initial map setup since it returns instantly
            const snapshotSubscription = this.afs
              .collection<Tag>('Tags')
              .ref.where('uid', '==', uid)
              .orderBy('tagId', 'desc')
              .onSnapshot(
                data => {
                  this.tagInfo = data.docs;
                  this.updateMapView(data);

                  snapshotSubscription();
                },
                error => {
                  Pro.monitoring.log('onSnapshot Error: ' + error, {
                    level: 'error'
                  });
                  console.error('onSnapshot Error: ' + JSON.stringify(error));
                }
              );

            // Subscribe to the valueChanges() query for continuous map updates
            const subscription = this.map$
              .takeUntil(this.destroyed$)
              .catch(error => Observable.throw(error))
              .subscribe(
                data => {
                  this.tagInfo = data;

                  if (this.state == AppState.APP_STATE_FOREGROUND) {
                    this.updateMapView(data);
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
                .catch(error => Observable.throw(error))
                .subscribe(
                  event => {
                    const zoom = event[0].zoom;

                    if (zoom > 17.5 && zoom > mapZoom) {
                      if (this.markerProvider.getLatLngArray().length > 1) {
                        this.markerProvider.spaceOutMarkers(zoom * 2);
                      }
                    }

                    mapZoom = zoom;
                  },
                  error => {
                    Pro.monitoring.log('Space out Markers Error: ' + error, {
                      level: 'error'
                    });
                    console.error(
                      'Space out markers: ' + JSON.stringify(error)
                    );
                  }
                );
            } catch (e) {
              Pro.monitoring.log('getMap() Error:' + JSON.stringify(e), {
                level: 'error'
              });
              console.error('getMap(): ' + JSON.stringify(e));
            }

            this.subscription.add(subscription);
          });
        })
        .catch(e => {
          console.error(e);
        });
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
            marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
              this.utils.getDirections(tag.name, tag.location);
            });
          })
          .catch(error => {
            console.error('addMarker() error: ' + error);
          });

        latlngArray.push(latlng);

        // Center the camera on the first marker
        if (index == 1) {
          setTimeout(() => {
            try {
              this.markerProvider.getMap().animateCamera({
                target: latlng,
                zoom: 17,
                duration: 50
              });
            } catch (e) {
              Pro.monitoring.log('getMap() Error:' + JSON.stringify(e), {
                level: 'error'
              });
            }

            this.splashscreen.hide();
          }, 1000);
        }
      } else if (this.markerProvider.isValid(tag.tagId)) {
        console.log('Adjusting marker position for ' + tag.name);
        try {
          this.markerProvider.getMarker(tag.tagId).setPosition(latlng);
        } catch (e) {
          console.error('Can not move marker: ' + e);
        }

        try {
          if (this.markerProvider.getMap().getCameraZoom() > 17.5) {
            if (this.markerProvider.getLatLngArray().length > 1) {
              this.markerProvider.spaceOutMarkers(2000);
            }
          }
        } catch (e) {
          Pro.monitoring.log('getMap() Error:' + JSON.stringify(e), {
            level: 'error'
          });
        }
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
