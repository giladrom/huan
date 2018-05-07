import { Component, ElementRef, OnDestroy } from '@angular/core';
import {
  NavController,
  AlertController,
  Platform,
  // normalizeURL,
  PopoverController,
  IonicPage
} from 'ionic-angular';

// import { AngularFireModule } from 'angularfire2';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
// import { AddPage } from '../add/add';
// import { ShowPage } from '../show/show';
// import { LoginPage } from '../login/login';

import { UtilsProvider } from '../../providers/utils/utils';

// import firebase from 'firebase/app';
import 'firebase/storage';
// import moment from 'moment';

import { Tag } from '../../providers/tag/tag';

import { AngularFireAuth } from 'angularfire2/auth';
import { AuthProvider } from '../../providers/auth/auth';

import {
  DomSanitizer
  // SafeResourceUrl,
  // SafeUrl
} from '@angular/platform-browser';
import { ViewChild } from '@angular/core';
import { Slides } from 'ionic-angular';

import { Geolocation } from '@ionic-native/geolocation';

// Google Maps API
import {
  GoogleMaps,
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMapsMapTypeId
  // MarkerCluster,
  // MarkerIcon
} from '@ionic-native/google-maps';
import { LocationProvider } from '../../providers/location/location';
import { HttpClient } from '@angular/common/http';
import { GetStartedPopoverPage } from '../get-started-popover/get-started-popover';
import { SettingsProvider } from '../../providers/settings/settings';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';
//import { Subscription } from '../order-tag/order-tag';
import {
  // ISubscription,
  Subscription
} from 'rxjs/Subscription';
// import { EditPage } from '../edit/edit';

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnDestroy {
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
  // private markers = {};
  private COORDINATE_OFFSET = 0.00003;

  private subscription: Subscription;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider,
    // private auth: AuthProvider,
    private googleMaps: GoogleMaps,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private loc: LocationProvider,
    // private geolocation: Geolocation,
    // private http: HttpClient,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider,
    private splashscreen: SplashScreen
  ) {
    // var avatars = {};
    this.viewMode = 'map';

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');

    this.platform.ready().then(() => {
      // Return tags for display, filter by uid
      this.utils.getUserId().then(uid => {
        this.tag$ = this.afs
          .collection<Tag>('Tags', ref => ref.where('uid', '==', uid))
          .snapshotChanges()
          .map(actions => {
            return actions.map(a => {
              const data = a.payload.doc.data() as Tag;
              const id = a.payload.doc.id;
              return { id, ...data };
            });
          });

        // Live Map
        this.loc
          .getLocation()
          .then(location => {
            var locStr = location.toString().split(',');
            var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

            let element = this.mapElement.nativeElement;
            this.map = this.googleMaps.create(element);

            if (this.map !== undefined) {
              this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
                this.map.setOptions({
                  mapType: GoogleMapsMapTypeId.NORMAL,
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
                  styles: [
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
                  ]
                });

                let options = {
                  target: latlng,
                  zoom: 15
                };

                this.map.moveCamera(options);
                this.map.setMyLocationEnabled(true);

                this.markerProvider.init(this.map);

                const subscription = this.tag$.subscribe(tags => {
                  console.log(
                    '****************************** Updating tag ******************************'
                  );

                  var index = 0;

                  tags.forEach(tag => {
                    index++;

                    var locStr = tag.location.toString().split(',');
                    var latlng = new LatLng(
                      Number(locStr[0]),
                      Number(locStr[1])
                    );

                    // Add a small offset to the icons to make sure they don't overlap
                    latlng.lat += index * this.COORDINATE_OFFSET;
                    latlng.lng += index * this.COORDINATE_OFFSET;

                    if (!this.markerProvider.exists(tag.tagId)) {
                      console.log('Adding marker for ' + tag.name);

                      this.markerProvider.addMarker(tag);
                    } else if (this.markerProvider.isValid(tag.tagId)) {
                      console.log('Adjusting marker position for ' + tag.name);
                      this.markerProvider
                        .getMarker(tag.tagId)
                        .setPosition(latlng);
                    }

                    this.updateTownName(tag);
                  });

                  console.log(
                    '****************************** Done Updating ******************************'
                  );
                });

                if (this.subscription !== undefined) {
                  this.subscription.add(subscription);
                } else {
                  this.subscription = subscription;
                }
              });
            }
          })
          .catch(error => {
            console.error('Unable to retrieve location from LocationProvider');
          });
      });
    });
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

  ionViewWillLoad() {}

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
    this.markerProvider.destroy();
    this.subscription.unsubscribe();
  }
}
