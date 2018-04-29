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

  public myPhotosRef: any;
  @ViewChild(Slides) slides: Slides;

  @ViewChild('mainmap') mapElement: ElementRef;
  @ViewChild('canvas') canvas: ElementRef;

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
                  }
                });

                let options = {
                  target: latlng,
                  zoom: 10
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
                      /*
                      this.markers[tag.tagId] = 0;

                      this.generateAvatar(tag.img, tag.lost).then(avatar => {
                        this.map
                          .addMarker({
                            icon: avatar,
                            flat: true,
                            title: tag.name,
                            position: latlng
                          })
                          .then(marker => {
                            this.markers[tag.tagId] = marker;

                            marker
                              .on(GoogleMapsEvent.MARKER_CLICK)
                              .subscribe(() => {
                                //this.navCtrl.push(ShowPage, tag.tagId);
                                this.showInfoPopover(tag.tagId);
                              });
                          });
                      });
                      */
                    } else if (this.markerProvider.isValid(tag.tagId)) {
                      console.log('Adjusting marker position for ' + tag.name);
                      this.markerProvider.getMarker(tag.tagId).setPosition(latlng);
                    }
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
/*
  generateAvatar(src, lost): Promise<any> {
    return new Promise((resolve, reject) => {
      var imgData;

      var petImg = new Image();
      var petCanvas;
      petImg.crossOrigin = 'anonymous';
      petImg.src = src;

      petImg.onload = () => {
        let canvas = <HTMLCanvasElement>document.createElement('canvas');
        let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

        canvas.width = 100;
        canvas.height = 100;

        ctx.save();
        ctx.beginPath();
        ctx.arc(35, 35, 35, 0, Math.PI * 2, true);
        ctx.fillStyle = '#a5a5a5';
        ctx.fill();
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(petImg, 0, 0, canvas.width - 30, canvas.height - 30);

        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        petCanvas = canvas;

        var markerImg = new Image();
        markerImg.crossOrigin = 'anonymous';
        
        if (!lost) { 
          markerImg.src = normalizeURL('assets/imgs/marker-green.png');
        } else {
          markerImg.src = normalizeURL('assets/imgs/marker-red.png');
        }

        markerImg.onload = () => {
          let canvas = <HTMLCanvasElement>document.createElement('canvas');
          let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

          console.log('***********************************');
          console.log('Generating avatar for ' + src);
          console.log('***********************************');

          ctx.webkitImageSmoothingEnabled = true;

          canvas.width = markerImg.naturalWidth / 5;
          canvas.height = markerImg.naturalHeight / 5;

          ctx.drawImage(markerImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-atop';

          ctx.drawImage(
            petCanvas,
            4,
            3,
            petCanvas.width - 3,
            petCanvas.height - 2
          );

          ctx.translate(0.5, 0.5);
          ctx.restore();

          resolve(canvas.toDataURL());
        };
      };
    });
  }

  showInfoPopover(tagId) {
    let popover = this.popoverCtrl.create(
      ShowPage,
      { tagId: tagId },
      {
        enableBackdropDismiss: true,
        cssClass: 'show-info-popover'
      }
    );

    popover.present();
  }
*/
  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }

  addTag() {
    this.navCtrl.push(AddPage);
  }

  showTag(tagItem) {
    this.navCtrl.push(ShowPage, tagItem);
  }

  deleteTag(tagItem) {
    this.myPhotosRef = firebase.storage().ref('/Photos/');

    // Display a confirmation alert before deleting

    let confirm = this.alertCtrl.create({
      title: 'Delete ' + tagItem.name,
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Delete',
          handler: () => {
            // Need to have an exception handler here since trying to get a reference
            // to a nonexistent URL throws an error
            try {
              var ref = firebase.storage().refFromURL(tagItem.img);

              if (ref.fullPath.length > 0) {
                ref
                  .delete()
                  .then(function() {
                    console.log('Removed ' + tagItem.img);
                  })
                  .catch(function(error) {
                    console.log(
                      'Unable to delete img from DB: ' + JSON.stringify(error)
                    );
                  });
              }
            } catch (e) {
              console.log(
                'Unable to delete image for tag ' +
                  tagItem.id +
                  ' (' +
                  tagItem.img +
                  ')'
              );
            }

            this.tagCollectionRef
              .doc(tagItem.id)
              .delete()
              .then(function() {
                console.log('Removed ' + tagItem.id);
              })
              .catch(function(error) {
                console.log(
                  'Unable to remove entry from DB: ' + JSON.stringify(error)
                );
              });
          }
        }
      ]
    });

    confirm.present();
  }

  markAsLost(tagItem) {
    let confirm = this.alertCtrl.create({
      title: 'Mark ' + tagItem.name + ' as lost',
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Mark Lost!',
          handler: () => {
            console.log('Marking ' + tagItem.name + ' as lost!');
            this.tagCollectionRef.doc(tagItem.id).update({ lost: true });
          }
        }
      ]
    });

    confirm.present();
  }

  markAsFound(tagItem) {
    let confirm = this.alertCtrl.create({
      title: 'Is ' + tagItem.name + ' found',
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Mark Found!',
          handler: () => {
            console.log('Marking ' + tagItem.name + ' as found!');
            this.tagCollectionRef.doc(tagItem.id).update({ lost: false });
          }
        }
      ]
    });

    confirm.present();
  }

  ionViewWillLoad() {
    /*
    this.slides.spaceBetween = 50;
    this.slides.pager = true;
    this.slides.paginationType = "fraction"
    this.slides.effect = "flip";
    this.slides.resize();
    */
  }

  getBackground(image) {
    return this._sanitizer.bypassSecurityTrustStyle(
      `linear-gradient(rgba(29, 29, 29, 0), rgba(16, 16, 23, 0.5)), url(${image})`
    );
  }
}
