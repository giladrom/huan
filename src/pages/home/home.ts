import { Component, ElementRef } from '@angular/core';
import {
  NavController,
  AlertController,
  Platform,
  normalizeURL,
  PopoverController
} from 'ionic-angular';

import { AngularFireModule } from 'angularfire2';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import { AddPage } from '../add/add';
import { ShowPage } from '../show/show';
import { LoginPage } from '../login/login';

import { UtilsProvider } from '../../providers/utils/utils';

import firebase from 'firebase/app';
import 'firebase/storage';
import moment from 'moment';

import { Tag } from '../../providers/tag/tag';

import { AngularFireAuth } from 'angularfire2/auth';
import { AuthProvider } from '../../providers/auth/auth';

import {
  DomSanitizer,
  SafeResourceUrl,
  SafeUrl
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
  GoogleMapsMapTypeId,
  MarkerCluster,
  MarkerIcon
} from '@ionic-native/google-maps';
import { LocationProvider } from '../../providers/location/location';
import { HttpClient } from '@angular/common/http';
import { GetStartedPopoverPage } from '../get-started-popover/get-started-popover';
import { SettingsProvider } from '../../providers/settings/settings';
import { MarkerProvider } from '../../providers/marker/marker';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
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
  private markers = {};
  private COORDINATE_OFFSET = 0.00003;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider,
    private auth: AuthProvider,
    private googleMaps: GoogleMaps,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private loc: LocationProvider,
    private geolocation: Geolocation,
    private http: HttpClient,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private markerProvider: MarkerProvider
  ) {
    var avatars = {};
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
                      featureType: 'administrative.country',
                      elementType: 'geometry.stroke',
                      stylers: [
                        {
                          color: '#4b6878'
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
                      featureType: 'administrative.province',
                      elementType: 'geometry.stroke',
                      stylers: [
                        {
                          color: '#4b6878'
                        }
                      ]
                    },
                    {
                      featureType: 'landscape.man_made',
                      elementType: 'geometry.stroke',
                      stylers: [
                        {
                          color: '#334e87'
                        }
                      ]
                    },
                    {
                      featureType: 'landscape.natural',
                      elementType: 'geometry',
                      stylers: [
                        {
                          color: '#023e58'
                          //color: '#f5f5f5'
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
                          color: '#6f9ba5'
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
                          color: '#023e58'
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
                      featureType: 'road.highway',
                      elementType: 'geometry',
                      stylers: [
                        {
                          color: '#3a3e46'
                        }
                      ]
                    },
                    {
                      featureType: 'road.highway',
                      elementType: 'geometry.stroke',
                      stylers: [
                        {
                          color: '#3a3e46'
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
                      elementType: 'labels',
                      stylers: [
                        {
                          visibility: 'on'
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
                      elementType: 'geometry',
                      stylers: [
                        {
                          color: '#0e1626'
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

                this.tag$.subscribe(tags => {
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
    this.navCtrl.push(AddPage);
  }

  showTag(tagItem) {
    this.navCtrl.push(ShowPage, tagItem);
  }

  // deleteTag(tagItem) {
  //   this.myPhotosRef = firebase.storage().ref('/Photos/');

  //   // Display a confirmation alert before deleting

  //   let confirm = this.alertCtrl.create({
  //     title: 'Delete ' + tagItem.name,
  //     message: 'Are you sure?',
  //     buttons: [
  //       {
  //         text: 'Cancel',
  //         handler: () => {
  //           console.log('Cancel clicked');
  //         }
  //       },
  //       {
  //         text: 'Delete',
  //         handler: () => {
  //           // Need to have an exception handler here since trying to get a reference
  //           // to a nonexistent URL throws an error
  //           try {
  //             var ref = firebase.storage().refFromURL(tagItem.img);

  //             if (ref.fullPath.length > 0) {
  //               ref
  //                 .delete()
  //                 .then(function() {
  //                   console.log('Removed ' + tagItem.img);
  //                 })
  //                 .catch(function(error) {
  //                   console.log(
  //                     'Unable to delete img from DB: ' + JSON.stringify(error)
  //                   );
  //                 });
  //             }
  //           } catch (e) {
  //             console.log(
  //               'Unable to delete image for tag ' +
  //                 tagItem.id +
  //                 ' (' +
  //                 tagItem.img +
  //                 ')'
  //             );
  //           }

  //           this.tagCollectionRef
  //             .doc(tagItem.id)
  //             .delete()
  //             .then(function() {
  //               console.log('Removed ' + tagItem.id);
  //             })
  //             .catch(function(error) {
  //               console.log(
  //                 'Unable to remove entry from DB: ' + JSON.stringify(error)
  //               );
  //             });
  //         }
  //       }
  //     ]
  //   });

  //   confirm.present();
  // }

  // markAsLost(tagItem) {
  //   let confirm = this.alertCtrl.create({
  //     title: 'Mark ' + tagItem.name + ' as lost',
  //     message: 'Are you sure?',
  //     buttons: [
  //       {
  //         text: 'Cancel',
  //         handler: () => {
  //           console.log('Cancel clicked');
  //         }
  //       },
  //       {
  //         text: 'Mark Lost!',
  //         handler: () => {
  //           console.log('Marking ' + tagItem.name + ' as lost!');
  //           this.tagCollectionRef.doc(tagItem.id).update({ lost: true });
  //         }
  //       }
  //     ]
  //   });

  //   confirm.present();
  // }

  // markAsFound(tagItem) {
  //   let confirm = this.alertCtrl.create({
  //     title: 'Is ' + tagItem.name + ' found',
  //     message: 'Are you sure?',
  //     buttons: [
  //       {
  //         text: 'Cancel',
  //         handler: () => {
  //           console.log('Cancel clicked');
  //         }
  //       },
  //       {
  //         text: 'Mark Found!',
  //         handler: () => {
  //           console.log('Marking ' + tagItem.name + ' as found!');
  //           this.tagCollectionRef.doc(tagItem.id).update({ lost: false });
  //         }
  //       }
  //     ]
  //   });

  //   confirm.present();
  // }

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
  }
}
