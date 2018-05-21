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
import 'rxjs';

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
  @ViewChild(Content) content: Content;

  @ViewChild('mainmap') mapElement: ElementRef;
  @ViewChild('canvas') canvas: ElementRef;
  @ViewChild('taglist') tagListElement: ElementRef;
  @ViewChild('navbutton') navButtonElement: ElementRef;

  // Map variables
  map: GoogleMap;
  private COORDINATE_OFFSET = 0.00003;

  private subscription: Subscription;

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

    this.viewMode = 'list';

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');

    this.update$ = new Subject<any>();
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

    this.update$.next(1);

    switch (this.viewMode) {
      case 'map': {
        this.content.scrollToTop(0);

        this.mapElement.nativeElement.style.display = 'block';
        this.tagListElement.nativeElement.style.opacity = '0';
        this.tagListElement.nativeElement.style.visibility = 'hidden';

        if (this.map) {
          this.map.setVisible(true);
        }

        this.navButtonElement.nativeElement.style.display = 'block';
        break;
      }

      case 'list': {
        this.mapElement.nativeElement.style.display = 'none';

        if (this.map) {
          this.map.setVisible(false);
        }

        this.tagListElement.nativeElement.style.opacity = '1';
        this.tagListElement.nativeElement.style.visibility = 'visible';

        this.navButtonElement.nativeElement.style.display = 'none';

        break;
      }
    }
  }

  ionViewDidLoad() {
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

          console.log('*** RETRIEVED CURRENT LOCATION');
        })
        .catch(error => {
          console.error('Unable to determine current location: ' + error);
        });

      // Return tags for display, filter by uid
      this.utils.getUserId().then(uid => {
        console.log('*** RETRIEVED USER ID');

        // Get observable for list and map views
        this.map$ = this.afs
          .collection<Tag>('Tags', ref =>
            ref.where('uid', '==', uid).orderBy('name', 'desc')
          )
          .valueChanges()
          .takeUntil(this.destroyed$);

        this.tag$ = this.map$.sample(this.update$.asObservable());

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
          }
          // styles: this.map_style
        };

        this.map = GoogleMaps.create('mainmap', mapOptions);

        console.log('*** CREATED MAP');

        if (this.map !== undefined) {
          this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
            console.log('*** MAP READY');

            this.map.setMyLocationEnabled(true);

            this.markerProvider.init(this.map);

            // Use a snapshot query for initial map setup since it returns instantly
            const snapshotSubscription = this.afs
              .collection<Tag>('Tags')
              .ref.where('uid', '==', uid)
              .orderBy('lastseen', 'desc')
              .onSnapshot(data => {
                this.tagInfo = data.docs;
                this.updateMapView(data);

                snapshotSubscription();
              });

            // Subscribe to the valueChanges() query for continuous map updates
            const subscription = this.map$.subscribe(data => {
              this.tagInfo = data;
              this.updateMapView(data);
            });

            if (this.subscription !== undefined) {
              this.subscription.add(subscription);
            } else {
              this.subscription = subscription;
            }
          });
        }
      });
    });
  }

  isLost(tagId): boolean {
    for (var i = 0; i < this.tagInfo.length; i++) {
      var tag,
        val = this.tagInfo[i];

      if (typeof val.data === 'function') {
        tag = val.data();
      } else {
        tag = val;
      }

      if (tag.tagId == tagId) {
        return tag.lost;
      }
    }
  }

  getSubtitleCssClass(tagId) {
    let lost = this.isLost(tagId);
    var style = {
      'card-subtitle-lost': lost,
      'card-subtitle': !lost
    };

    return style;
  }

  getTags() {
    var formattedTagInfo = [];

    for (var i = 0; i < this.tagInfo.length; i++) {
      var tag,
        val = this.tagInfo[i];

      if (typeof val.data === 'function') {
        tag = val.data();
      } else {
        tag = val;
      }

      formattedTagInfo[tag.tagId] = tag;
    }

    return formattedTagInfo;
  }

  getSubtitleText(tagId) {
    var formattedTagInfo = this.getTags();

    if (formattedTagInfo[tagId]) {
      if (this.isLost(tagId)) {
        return (
          'Marked as lost ' + this.lastSeen(formattedTagInfo[tagId].markedlost)
        );
      } else {
        return 'Last seen ' + this.lastSeen(formattedTagInfo[tagId].lastseen);
      }
    } else {
      return ' ';
    }
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

      // Add a small offset to the icons to make sure they don't overlap
      // latlng.lat += index * this.COORDINATE_OFFSET;
      // latlng.lng += index * this.COORDINATE_OFFSET;

      if (!this.markerProvider.exists(tag.tagId)) {
        console.log('Adding marker for ' + tag.name);

        this.markerProvider
          .addMarker(tag)
          .then(marker => {
            marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
              this.viewMode = 'list';
              this.updateView();

              this.scrollToElement(`list-item${tag.tagId}`);
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
            duration: 2000
          });
        }
      } else if (this.markerProvider.isValid(tag.tagId)) {
        console.log('Adjusting marker position for ' + tag.name);
        this.markerProvider.getMarker(tag.tagId).setPosition(latlng);
      }

      this.updateTownName(tag);
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
      duration: 2000
    });
  }

  ionViewDidEnter() {
    this.splashscreen.hide();

    // XXX FOR TESTING ONLY
    setTimeout(() => {
      this.viewMode = 'list';
      this.updateView();
      // XXX
    }, 1000);

    // Display welcome popover on first login
    this.settings.getSettings().then(data => {
      if (data.showWelcome === true) {
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

  expandCollapseItem(tagId) {
    let item = document.getElementById(`list-item${tagId}`);
    let element = document.getElementById(`details${tagId}`);
    let expand = document.getElementById(`expand-arrow${tagId}`);
    let collapse = document.getElementById(`collapse-arrow${tagId}`);

    switch (element.style.height) {
      case '0px':
        item.style.height = Number(340 + this.drawerHeight).toString() + 'px';
        expand.style.display = 'none';
        collapse.style.display = 'block';
        // element.style.opacity = '1';
        element.style.height = this.drawerHeight + 'px';
        break;
      case this.drawerHeight + 'px':
        item.style.height = '340px';
        collapse.style.display = 'none';
        element.style.height = '0px';
        // element.style.opacity = '0';
        expand.style.display = 'block';
        break;
    }
  }

  showOnMap(tagId) {
    this.viewMode = 'map';
    var latlng = this.markerProvider.getMarker(tagId).getPosition();
    this.updateView();

    console.log('Showing marker at ' + latlng);
    this.map.moveCamera({
      target: latlng,
      zoom: 20,
      duration: 2000
    });
  }

  ngOnDestroy() {
    console.log('Destroying home view');

    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.markerProvider.destroy();
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }

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

  scrollToElement(id) {
    var el = document.getElementById(id);
    this.content.scrollTo(0, el.offsetTop - this.drawerHeight, 800);
  }

  showNotifications(event) {
    this.notificationProvider.showNotificationsPopover(event);

    let notificationsButtonElement = document.getElementById(
      'notificationsbutton'
    );

    notificationsButtonElement.style.color = 'white';
    notificationsButtonElement.style.textShadow = 'initial';
  }

  getCssClass(tagId) {
    let lost = this.isLost(tagId);
    var style = {
      marklost: !lost,
      markfound: lost
    };

    return style;
  }

  markAsText(tagId) {
    if (!this.isLost(tagId)) {
      return 'Mark as lost';
    } else {
      return 'Mark as found';
    }
  }

  markAsFunc(tagId) {
    if (!this.isLost(tagId)) {
      this.markAsLost(tagId);
    } else {
      this.markAsFound(tagId);
    }
  }

  markAsLost(tagId) {
    console.log('Mark As Lost clicked');

    this.afs
      .collection<Tag>('Tags')
      .doc(tagId)
      .ref.get()
      .then(data => {
        let confirm = this.alertCtrl.create({
          title: 'Mark ' + data.get('name') + ' as lost',
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
                // this.expandCollapseItem(tagId);

                this.afs
                  .collection<Tag>('Tags')
                  .doc(data.get('tagId'))
                  .update({
                    lost: true,
                    markedlost: Date.now()
                  });

                this.markerProvider.deleteMarker(tagId);
              }
            }
          ],
          cssClass: 'alertclass'
        });

        confirm.present();
      });
  }

  markAsFound(tagId) {
    this.afs
      .collection<Tag>('Tags')
      .doc(tagId)
      .ref.get()
      .then(data => {
        let confirm = this.alertCtrl.create({
          title: 'Mark ' + data.get('name') + ' as found',
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
                // this.expandCollapseItem(tagId);

                this.afs
                  .collection<Tag>('Tags')
                  .doc(data.get('tagId'))
                  .update({
                    lost: false,
                    markedfound: Date.now()
                  });

                this.markerProvider.deleteMarker(tagId);
              }
            }
          ],
          cssClass: 'alertclass'
        });

        confirm.present();
      });
  }
}
