import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController,
  Platform
} from 'ionic-angular';
import { QrProvider } from '../../providers/qr/qr';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';
import { AuthProvider } from '../../providers/auth/auth';
import { BleProvider } from '../../providers/ble/ble';
import { Observable } from 'rxjs/Observable';
import { Beacon } from '@ionic-native/ibeacon';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../../providers/tag/tag';
import { ReplaySubject } from 'rxjs/ReplaySubject';

@IonicPage()
@Component({
  selector: 'page-found-pet',
  templateUrl: 'found-pet.html'
})
export class FoundPetPage {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private tagList = [];

  showScanning: any;
  showList: any;
  showScanQR: any;

  tagId: any;
  tags$: Observable<Tag[]>;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private qrProvider: QrProvider,
    private markerProvider: MarkerProvider,
    private alertController: AlertController,
    private splashScreen: SplashScreen,
    private authProvider: AuthProvider,
    private bleProvider: BleProvider,
    private platform: Platform,
    private utilsProvider: UtilsProvider,
    private afs: AngularFirestore
  ) {
    this.showScanning = true;
    this.showList = false;
    this.showScanQR = false;

    var beacons$: Observable<Beacon[]>;

    var tagSubject = new ReplaySubject<Tag[]>();
    var beaconSubscription;

    tagSubject.takeUntil(this.destroyed$).subscribe(tag => {
      tag.forEach(t => {
        console.log('Received: ' + JSON.stringify(t));
      });
    });

    this.tags$ = tagSubject.asObservable();

    var interval = setTimeout(() => {
      this.showScanning = false;
      this.showScanQR = true;

      beaconSubscription.unsubscribe();
    }, 10000);

    this.platform.ready().then(() => {
      beacons$ = this.bleProvider.getTags();
      this.tagList = [];

      beaconSubscription = beacons$
        .takeUntil(this.destroyed$)
        .subscribe(beacon => {
          console.log('beacon: ' + JSON.stringify(beacon));

          var foundBeacons = false;

          beacon.forEach(b => {
            var paddedId = this.utilsProvider.pad(b.minor, 4, '0');

            var unsubscribe = this.afs
              .collection<Tag>('Tags')
              .doc(paddedId)
              .ref.onSnapshot(data => {
                if (data.data()) {
                  console.log('Pushing: ' + JSON.stringify(data.data()));

                  this.tagList.push(<Tag>data.data());
                  tagSubject.next(this.tagList);

                  foundBeacons = true;
                }

                unsubscribe();
              });
          });

          if (beacon.length > 0) {
            this.showScanning = false;
            this.showList = true;

            this.destroyed$.next(true);
            this.destroyed$.complete();

            //tagSubject.complete();
            clearInterval(interval);
          }
        });
    });
  }

  scanQR() {
    this.qrProvider
      .scan()
      .then(() => {
        this.tagId = this.qrProvider.getScannedTagId().minor;

        console.log('Showing Info for tag ' + this.tagId);

        this.markerProvider.showInfoPopover(this.tagId, true);
      })
      .catch(error => {
        this.incompatibleTag(error);
      });
  }

  incompatibleTag(error) {
    let confirm = this.alertController.create({
      title: 'Error scanning Tag',
      message: error,
      buttons: [
        {
          text: 'Ok',
          handler: () => {}
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
  }

  showInfoPopover(tagId) {
    this.markerProvider.showInfoPopover(tagId, true);
  }

  logout() {
    this.authProvider.logoutUser().catch(error => {
      console.error(error);
    });
  }

  lastSeen(lastseen) {
    return this.utilsProvider.getLastSeen(lastseen);
  }

  ionViewWillLoad() {
    this.tagList = [];
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad FoundPetPage');
    this.splashScreen.hide();

    // setTimeout((this.showPage = true), 1000);
  }
}
