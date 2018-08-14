import { Component, ViewChild, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController,
  Platform,
  PopoverController,
  Content,
  normalizeURL
} from 'ionic-angular';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import { AuthProvider } from '../../providers/auth/auth';
import { DomSanitizer } from '@angular/platform-browser';
import { LocationProvider } from '../../providers/location/location';
import { SettingsProvider } from '../../providers/settings/settings';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Observable } from 'rxjs/Observable';
import { Tag } from '../../providers/tag/tag';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { MarkerProvider } from '../../providers/marker/marker';
import { map } from 'rxjs/operators';
import { BleProvider } from '../../providers/ble/ble';
import { QrProvider } from '../../providers/qr/qr';

import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/sampleTime';
import 'rxjs/add/operator/throttle';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';

@IonicPage()
@Component({
  selector: 'page-list',
  templateUrl: 'list.html'
})
export class ListPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private tagInfo = [];
  private townName = {};
  private box_height;
  tag$: Observable<Tag[]>;

  private drawerHeight = 140;

  @ViewChild(Content)
  content: Content;

  private bluetooth;
  private auth;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider,
    private _sanitizer: DomSanitizer,
    private platform: Platform,
    private locationProvider: LocationProvider,
    public popoverCtrl: PopoverController,
    private settings: SettingsProvider,
    private splashscreen: SplashScreen,
    private markerProvider: MarkerProvider,
    private BLE: BleProvider,
    private qrProvider: QrProvider
  ) {
    console.log('Initializing List Page');

    this.platform.ready().then(() => {
      this.BLE.getBluetoothStatus().subscribe(status => {
        this.bluetooth = status;
      });

      this.BLE.getAuthStatus().subscribe(status => {
        this.auth = status;
      });

      this.authProvider.getUserId().then(uid => {
        this.tag$ = this.afs
          .collection<Tag>('Tags', ref =>
            ref.where('uid', '==', uid).orderBy('name', 'desc')
          )
          .valueChanges()
          .catch(e => Observable.throw(e))
          .retry(2)
          .takeUntil(this.destroyed$);

        this.tag$.subscribe(tag => {
          console.log('Tag list length: ' + tag.length);

          this.tagInfo = tag;

          tag.forEach(t => {
            this.updateTownName(t);
          });
        });
      });
    });
  }

  trackByTags(index: number, tag: Tag) {
    return tag.img;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ionViewDidLoad() {
    this.box_height = 340;
  }

  ionViewDidEnter() {}

  lastSeen(lastseen) {
    return this.utilsProvider.getLastSeen(lastseen);
  }

  getTagWarnings(tag) {
    if (Date.now() - tag.lastseen > 60 * 60 * 24 * 1000) {
      return true;
    }

    if (tag.tagattached === false) {
      return true;
    }
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
        return tag.lost !== false;
      }
    }
  }

  getCssClass(tagId) {
    let lost = this.isLost(tagId);
    var style = {
      marklost: !lost,
      markfound: lost
    };

    return style;
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

  getTitleText(tag) {
    if (tag.name.length > 2) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize = '3em';
    }

    if (tag.name.length > 15) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize =
        '2.5em';
    }

    if (tag.name.length > 17) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize = '2em';
    }

    if (tag.name.length > 23) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize =
        '1.5em';
    }

    return tag.name;
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

  getBatteryIcon(batt) {
    if (batt > 66) {
      return normalizeURL('assets/imgs/battery-100.png');
    } else if (batt > 33) {
      return normalizeURL('assets/imgs/battery-66.png');
    } else if (batt > 0) {
      return normalizeURL('assets/imgs/battery-33.png');
    } else if (batt === 0) {
      return normalizeURL('assets/imgs/battery-0.png');
    } else if (batt === -1) {
      return '';
    }
  }

  expandCollapseItem(tagId) {
    let item = document.getElementById(`list-item${tagId}`);
    let element = document.getElementById(`details${tagId}`);
    let expand = document.getElementById(`expand-arrow${tagId}`);
    let collapse = document.getElementById(`collapse-arrow${tagId}`);

    switch (element.style.height) {
      case '0px':
        item.style.height =
          Number(this.box_height + this.drawerHeight).toString() + 'px';
        expand.style.display = 'none';
        collapse.style.display = 'block';
        // element.style.opacity = '1';
        element.style.height = this.drawerHeight + 'px';
        break;
      case this.drawerHeight + 'px':
        item.style.height = this.box_height + 'px';
        collapse.style.display = 'none';
        element.style.height = '0px';
        // element.style.opacity = '0';
        expand.style.display = 'block';
        break;
    }
  }

  updateTownName(tag) {
    this.locationProvider
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

  getTagImgSrc(tag) {
    return tag.img;
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
          message: 'This will notify everyone in your community. Are you sure?',
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

  addTag() {
    this.navCtrl.push('AddPage');
  }

  showTag(tagItem) {
    this.navCtrl.push('ShowPage', tagItem);
  }

  showOnMap(tagId) {
    var latlng = this.markerProvider.getMarker(tagId).getPosition();

    console.log('Showing marker at ' + latlng);
    this.markerProvider.getMap().moveCamera({
      target: latlng,
      zoom: 20,
      duration: 2000
    });

    // Switch to Map Tab
    this.navCtrl.parent.select(0);
  }

  editTag(tagItem) {
    this.navCtrl.push('EditPage', tagItem);
  }

  scrollToElement(id) {
    console.log('Scrolling to ' + id);

    var el = document.getElementById(id);

    if (el !== null) {
      this.content.scrollTo(0, el.offsetTop - this.drawerHeight, 800);
    } else {
      console.log(`Element ${id} is undefined`);
    }
  }

  gotoOrderPage() {
    this.navCtrl.push('OrderTagPage');
  }

  deleteTag(tagId) {
    this.afs
      .collection<Tag>('Tags')
      .doc(tagId)
      .delete()
      .then(() => {
        this.markerProvider.deleteMarker(tagId);
      })
      .catch(error => {
        console.error('Unable to delete: ' + JSON.stringify(error));
      });
  }

  attachTag(tag) {
    this.qrProvider
      .scan()
      .then(() => {
        var minor = this.qrProvider.getScannedTagId().minor;

        var unsubscribe = this.afs
          .collection<Tag>('Tags')
          .doc(minor)
          .ref.onSnapshot(doc => {
            if (doc.exists) {
              // someone already registered this tag, display an error
              this.utilsProvider.displayAlert(
                'Unable to use tag',
                'Scanned tag is already in use'
              );
            } else {
              // Save original tag ID
              let original_tagId = tag.tagId;

              // Assign new tag ID from scanned QR
              tag.tagId = minor;
              tag.tagattached = true;

              // Create new document with new tagID
              this.afs
                .collection<Tag>('Tags')
                .doc(minor)
                .set(tag)
                .then(() => {
                  console.log(
                    'attachTag(): Removing original document ' + original_tagId
                  );

                  // Delete original tag document
                  this.deleteTag(original_tagId);
                })
                .catch(error => {
                  console.error(
                    'attachTag(): Unable to add tag: ' + JSON.stringify(error)
                  );
                });
            }

            unsubscribe();
          });
      })
      .catch(e => {
        console.error(
          'attachTag(): Unable to scan QR code: ' + JSON.stringify(e)
        );
      });
  }
}
