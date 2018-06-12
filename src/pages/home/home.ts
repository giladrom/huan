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

// import 'rxjs';
import { AuthProvider } from '../../providers/auth/auth';

@IonicPage({ priority: 'high' })
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

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
  map: GoogleMap;

  private subscription: Subscription = new Subscription();

  private drawerHeight = 140;

  private notification$: Subject<Notification[]>;

  private update$: Subject<any>;

  private tagInfo = [];

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
    private loc: LocationProvider,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider,
    private splashscreen: SplashScreen,
    private notificationProvider: NotificationProvider
  ) {
    this.notification$ = new Subject<Notification[]>();

    this.viewMode = 'map';

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');

    this.update$ = new Subject<any>();

    // this.platform.resume.subscribe(e => {
    //   console.log('### Resumed foreground mode');

    //   if (this.map !== undefined && this.viewMode == 'map') {
    //     this.map.setDiv('mainmap');
    //     this.map.setClickable(true);
    //   }
    // });

    this.platform.pause.subscribe(() => {
      console.log('### Entered Background mode');
    });
  }

  addTag() {
    this.navCtrl.push('AddPage');
  }

  showTag(tagItem) {
    this.navCtrl.push('ShowPage', tagItem);
  }

  ionViewDidLoad() {
    // XXX FOR TESTING ONLY
    // setTimeout(() => {
    //   this.viewMode = 'list';
    //   this.updateView();
    // }, 1000);
    // XXX

    this.destroyed$ = new ReplaySubject(1);

    // Set initial map location
    var current_location = new LatLng(34.015283, -118.215057);

    this.platform.ready().then(() => {
      this.notificationProvider.getNotifications().subscribe(() => {
        let notificationsButtonElement = document.getElementById(
          'notificationsbutton'
        );

        notificationsButtonElement.style.color = 'rgb(255, 121, 121)';
        notificationsButtonElement.style.textShadow = '#000 1px 1px 1px';
      });

      this.loc
        .getLocation()
        .then(location => {
          var locStr = location.toString().split(',');
          current_location = new LatLng(Number(locStr[0]), Number(locStr[1]));

          if (this.map) {
            this.map.moveCamera({
              target: current_location,
              zoom: 17
            });
          }
          console.log('*** RETRIEVED CURRENT LOCATION');
        })
        .catch(error => {
          console.error('Unable to determine current location: ' + error);
        });

      let mapOptions: GoogleMapOptions = {
        camera: {
          target: current_location,
          zoom: 15
        },
        controls: {
          compass: false,
          myLocationButton: true,
          indoorPicker: false,
          zoom: false
        },
        gestures: {
          scroll: true,
          tilt: false,
          rotate: true,
          zoom: true
        }
        // styles: this.map_style
      };

      this.map = GoogleMaps.create('mainmap', mapOptions);
      this.splashscreen.hide();
      console.log('*** CREATED MAP');

      // Return tags for display, filter by uid
      this.authProvider.getUserId().then(uid => {
        console.log('*** RETRIEVED USER ID');

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

        // Create the map on a slight delay to make sure DOM is ready
        // setTimeout(() => {

        // if (this.map !== undefined) {
        // this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
        // console.log('*** MAP READY');

        this.map.setMyLocationEnabled(true);

        this.markerProvider.init(this.map);

        // Use a snapshot query for initial map setup since it returns instantly
        const snapshotSubscription = this.afs
          .collection<Tag>('Tags')
          .ref.where('uid', '==', uid)
          .orderBy('tagId', 'desc')
          .onSnapshot(data => {
            this.tagInfo = data.docs;
            this.updateMapView(data);

            snapshotSubscription();
          });

        // Subscribe to the valueChanges() query for continuous map updates
        const subscription = this.map$.takeUntil(this.destroyed$).subscribe(
          data => {
            this.tagInfo = data;
            this.updateMapView(data);
          },
          error => {
            this.utils.displayAlert(error);
            console.error(error);
          }
        );

        // Space out markers when zooming in
        var mapZoom;
        this.map.on(GoogleMapsEvent.CAMERA_MOVE).subscribe(event => {
          const zoom = event[0].zoom;

          if (zoom > 17.5 && zoom > mapZoom) {
            if (this.markerProvider.getLatLngArray().length > 1) {
              this.markerProvider.spaceOutMarkers(zoom * 2);
            }
          }

          mapZoom = zoom;
        });

        // if (this.subscription !== undefined) {
        this.subscription.add(subscription);
        // } else {
        //   this.subscription = subscription;
        // }
        // });
        // } else {
        //   console.error('Map is undefined');
        // }
        // }, 1000);
      });
    });
  }

  updateMapView(tags) {
    var latlngArray = [];
    var index = 0;

    console.log(
      '****************************** Updating tag ******************************'
    );

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
              this.navCtrl.parent.select(1);
              // this.scrollToElement(`list-item${tag.tagId}`);
            });
          })
          .catch(error => {
            console.error(error);
          });

        latlngArray.push(latlng);

        // Center the camera on the first marker
        if (index == 1) {
          this.map.animateCamera({
            target: latlng,
            zoom: 17,
            duration: 500
          });
        }
      } else if (this.markerProvider.isValid(tag.tagId)) {
        console.log('Adjusting marker position for ' + tag.name);
        this.markerProvider.getMarker(tag.tagId).setPosition(latlng);

        if (this.map.getCameraZoom() > 17.5) {
          if (this.markerProvider.getLatLngArray().length > 1) {
            this.markerProvider.spaceOutMarkers(2000);
          }
        }
      }
    });

    console.log(
      '****************************** Done Updating ******************************'
    );
  }

  showMyPets() {
    var latLngArray = this.markerProvider.getLatLngArray();

    this.map.animateCamera({
      target: latLngArray,
      zoom: 17,
      duration: 500
    });
  }

  ionViewWillLeave() {
    this.map.setDiv(null);
  }

  ionViewDidEnter() {
    let sub = new Subject();

    this.map.setDiv('mainmap');

    // Display welcome popover on first login
    this.settings
      .getSettings()
      .takeUntil(sub)
      .subscribe(settings => {
        if (settings) {
          sub.next();
          sub.complete();

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
