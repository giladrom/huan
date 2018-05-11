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

import { GetStartedPopoverPage } from '../get-started-popover/get-started-popover';
import { SettingsProvider } from '../../providers/settings/settings';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';

// The following two imports are required, ignore tslint warning
import { Subscription, ISubscription } from 'rxjs/Subscription';
import { ReplaySubject } from 'rxjs/ReplaySubject';

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  tagCollectionRef: AngularFirestoreCollection<Tag>;
  tag$: Observable<Tag[]>;

  viewMode: any;
  private townName = {};

  public myPhotosRef: any;
  @ViewChild(Slides) slides: Slides;

  @ViewChild('mainmap') mapElement: ElementRef;
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('taglist') tagListElement: ElementRef;

  // Map variables
  map: GoogleMap;
  private COORDINATE_OFFSET = 0.00003;

  private subscription: Subscription;

  private map_style = [
    {
      elementType: 'geometry',
      stylers: [
        {
          color: '#1d2c4d'
        }
      ]
    },
    {
      elementType: 'geometry.fill',
      stylers: [
        {
          color: '#c0c0c0'
        }
      ]
    },
    {
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#8ec3b9'
        }
      ]
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#1a3646'
        }
      ]
    },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels',
      stylers: [
        {
          visibility: 'off'
        }
      ]
    },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#64779e'
        }
      ]
    },
    {
      featureType: 'landscape.natural',
      elementType: 'geometry',
      stylers: [
        {
          color: '#8c929b'
        }
      ]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [
        {
          color: '#283d6a'
        }
      ]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text',
      stylers: [
        {
          visibility: 'off'
        }
      ]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#fafffc'
        }
      ]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#1d2c4d'
        }
      ]
    },
    {
      featureType: 'poi.business',
      stylers: [
        {
          visibility: 'off'
        }
      ]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry.fill',
      stylers: [
        {
          color: '#707682'
        }
      ]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#3C7680'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [
        {
          color: '#304a7d'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [
        {
          visibility: 'off'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#98a5be'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#1d2c4d'
        }
      ]
    },
    {
      featureType: 'road.arterial',
      stylers: [
        {
          color: '#707782'
        }
      ]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels',
      stylers: [
        {
          color: '#000000'
        }
      ]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#ffffff'
        }
      ]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#424242'
        }
      ]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [
        {
          color: '#2c6675'
        }
      ]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [
        {
          color: '#7e848f'
        }
      ]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [
        {
          color: '#2e3849'
        }
      ]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#b0d5ce'
        }
      ]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#023e58'
        }
      ]
    },
    {
      featureType: 'road.local',
      elementType: 'geometry',
      stylers: [
        {
          color: '#a9a9a9'
        }
      ]
    },
    {
      featureType: 'road.local',
      elementType: 'labels.text',
      stylers: [
        {
          color: '#d6d6d6'
        }
      ]
    },
    {
      featureType: 'road.local',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#424242'
        }
      ]
    },
    {
      featureType: 'transit',
      stylers: [
        {
          visibility: 'off'
        }
      ]
    },
    {
      featureType: 'transit',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#98a5be'
        }
      ]
    },
    {
      featureType: 'transit',
      elementType: 'labels.text.stroke',
      stylers: [
        {
          color: '#1d2c4d'
        }
      ]
    },
    {
      featureType: 'transit.line',
      elementType: 'geometry.fill',
      stylers: [
        {
          color: '#283d6a'
        }
      ]
    },
    {
      featureType: 'transit.station',
      elementType: 'geometry',
      stylers: [
        {
          color: '#3a4762'
        }
      ]
    },
    {
      featureType: 'water',
      stylers: [
        {
          color: '#2e3849'
        }
      ]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#4e6d70'
        }
      ]
    }
  ];

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider,
    // private googleMaps: GoogleMaps,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private loc: LocationProvider,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider,
    private splashscreen: SplashScreen
  ) {
    this.viewMode = 'map';

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');
  }

  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }

  addTag() {
    this.navCtrl.push('AddPage');
  }

  showTag(tagItem) {
    this.navCtrl.push('ShowPage', tagItem);
  }

  editTag(tagItem) {
    this.navCtrl.push('EditPage', tagItem);
  }

  updateView() {
    console.log('Segment changed: ' + this.viewMode);

    switch (this.viewMode) {
      case 'map': {
        this.mapElement.nativeElement.style.display = 'block';
        this.tagListElement.nativeElement.style.display = 'none';
        break;
      }

      case 'list': {
        this.mapElement.nativeElement.style.display = 'none';
        this.tagListElement.nativeElement.style.display = 'block';
        break;
      }
    }
  }

  ionViewDidLoad() {
    // Set initial map location
    var current_location = new LatLng(34.015283, -118.215057);

    this.platform.ready().then(() => {
      this.loc
        .getLocation()
        .then(location => {
          var locStr = location.toString().split(',');
          current_location = new LatLng(Number(locStr[0]), Number(locStr[1]));
        })
        .catch(error => {
          console.error('Unable to determine current location: ' + error);
        });

      // Return tags for display, filter by uid
      this.utils.getUserId().then(uid => {
        // Get observable for list view
        this.tag$ = this.afs
          .collection<Tag>('Tags', ref => ref.where('uid', '==', uid))
          .valueChanges()
          .takeUntil(this.destroyed$);

        let mapOptions: GoogleMapOptions = {
          mapType: GoogleMapsMapTypeId.NORMAL,
          camera: {
            target: current_location
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
          },
          styles: this.map_style
        };

        this.map = GoogleMaps.create('mainmap', mapOptions);

        if (this.map !== undefined) {
          this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
            this.map.setMyLocationEnabled(true);

            this.markerProvider.init(this.map);

            const subscription = this.afs
              .collection<Tag>('Tags')
              .ref.where('uid', '==', uid)
              .orderBy('lastseen', 'desc')
              .onSnapshot(data => {
                var tags = data;
                var latlngArray = [];

                console.log(
                  '****************************** Updating tag ******************************'
                );

                var index = 0;

                tags.forEach(tagItem => {
                  index++;

                  var tag = tagItem.data();

                  var locStr = tag.location.toString().split(',');
                  var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

                  // Add a small offset to the icons to make sure they don't overlap
                  latlng.lat += index * this.COORDINATE_OFFSET;
                  latlng.lng += index * this.COORDINATE_OFFSET;

                  if (!this.markerProvider.exists(tag.tagId)) {
                    console.log('Adding marker for ' + tag.name);

                    this.markerProvider.addMarker(tag);

                    latlngArray.push(latlng);

                    // Center the camera on the first marker
                    if (index == 1) {
                      this.map.animateCamera({
                        target: latlng,
                        zoom: 17,
                        duration: 2000
                      });
                    }
                  } else if (this.markerProvider.isValid(tag.tagId)) {
                    console.log('Adjusting marker position for ' + tag.name);
                    this.markerProvider
                      .getMarker(tag.tagId)
                      .setPosition(latlng);
                  }

                  this.updateTownName(tag);
                });

                // this.map.moveCamera({
                //   target: latlngArray,
                //   zoom: 17
                // });

                console.log(
                  '****************************** Done Updating ******************************'
                );
              });

            if (this.subscription !== undefined) {
              this.subscription.add(subscription);
            } else {
              // this.subscription = subscription;
            }
          });
        }
      });
    });
  }

  ionViewDidEnter() {
    this.splashscreen.hide();

    // Display welcome popover on first login
    this.settings.getSettings().then(data => {
      if (data.showWelcome === true) {
        console.log('Displaying welcome popover');

        let popover = this.popoverCtrl.create(
          GetStartedPopoverPage,
          {},
          {
            enableBackdropDismiss: true,
            cssClass: 'get-started-popover'
          }
        );
        popover.present();

        this.settings.setShowWelcome(false);
      }
    });
  }

  getListAvatar(image) {
    return this._sanitizer.bypassSecurityTrustResourceUrl(image);
  }

  getBackground(image) {
    return this._sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(rgba(29, 29, 29, 0), rgba(16, 16, 23, 0.5)), url(${image})`
    );
  }

  updateTownName(tag) {
    this.loc
      .getTownName(tag.location)
      .then(town => {
        this.townName[tag.tagId] = town;
      })
      .catch(error => {
        console.log('updateTownName:' + error);
      });
  }

  getTownName(tagId) {
    if (this.townName[tagId] !== undefined) {
      return this.townName[tagId];
    } else {
      return '';
    }
  }

  showInfoPopover(tagId) {
    this.markerProvider.showInfoPopover(tagId);
  }

  ngOnDestroy() {
    console.log('Destroying home view');

    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.markerProvider.destroy();
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }

    if (this.map !== undefined) {
      // this.map.destroy();
      this.map
        .remove()
        .then(data => {
          console.log('Removed map: ' + data);
        })
        .catch(error => {
          console.error('Unable to remove map: ' + error);
        });
    }
  }
}
