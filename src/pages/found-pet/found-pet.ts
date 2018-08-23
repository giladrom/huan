
import {takeUntil} from 'rxjs/operators';
import { Component, OnDestroy } from '@angular/core';
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
import { Observable ,  Subject ,  ReplaySubject } from 'rxjs';
import { Beacon } from '@ionic-native/ibeacon';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../../providers/tag/tag';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';

@IonicPage()
@Component({
  selector: 'page-found-pet',
  templateUrl: 'found-pet.html'
})
export class FoundPetPage implements OnDestroy {
  private destroyed$: Subject<boolean> = new Subject<boolean>();
  private tagList: Array<Tag> = [];

  private progressBar: any;

  showScanning: any;
  showList: any;
  showScanQR: any;

  tagId: any;
  tags$: Observable<Tag[]> = new Observable<Tag[]>();
  tagSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);

  get tagListObservable(): Observable<Tag[]> {
    return this.tagSubject.asObservable();
  }

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

    var beacons$: Observable<any>;

    var beaconSubscription;

    var foundBeacons = false;

    this.destroyed$ = new Subject();

    var interval = setTimeout(() => {
      this.bleProvider.stopScan();
      this.showScanning = false;

      if (foundBeacons) {
        this.showList = true;
      } else {
        this.showScanQR = true;
      }

      this.destroyed$.next(true);
      this.destroyed$.complete();

      if (beaconSubscription) {
        beaconSubscription.unsubscribe();
      }
    }, 15000);

    this.tagSubject.subscribe(tag => {
      tag.forEach(t => {
        console.log('Received: ' + JSON.stringify(t));
      });
    });

    this.platform.ready().then(() => {
      this.bleProvider.startScan();
      beacons$ = this.bleProvider.getTags();

      beaconSubscription = beacons$.pipe(
        takeUntil(this.destroyed$))
        .subscribe(beacon => {
          beacon.forEach(b => {
            var paddedId = this.utilsProvider.pad(b.info.minor, 4, '0');

            var exists = false;

            var unsubscribe = this.afs
              .collection<Tag>('Tags')
              .doc(paddedId)
              .ref.onSnapshot(data => {
                if (data.data()) {
                  this.tagList.forEach(t => {
                    if (t.tagId === data.data().tagId) {
                      exists = true;
                    }
                  });

                  if (!exists) {
                    console.log('Pushing: ' + JSON.stringify(data.data()));

                    this.tagList.push(<Tag>data.data());
                    this.tagSubject.next(this.tagList);
                  }
                  foundBeacons = true;
                }

                unsubscribe();
              });
          });
        });
    });
  }

  ngOnDestroy() {
    console.log('Destroying FountPetPage');
  }

  scanQR() {
    this.qrProvider
      .scan()
      .then(() => {
        this.tagId = this.qrProvider.getScannedTagId().minor;

        var unsubscribe = this.afs
          .collection<Tag>('Tags')
          .doc(this.tagId)
          .ref.onSnapshot(doc => {
            if (doc.exists) {
              console.log('Showing Info for tag ' + this.tagId);

              this.markerProvider.showInfoPopover(this.tagId, true);
            } else {
              this.utilsProvider.displayAlert(
                'Unable to display info',
                'Scanned tag is not registered.'
              );
            }

            unsubscribe();
          });
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
    this.progressBar = document.getElementById('progressbar');

    var progress = 1;
    var progressInterval = setInterval(() => {
      progress++;

      this.progressBar.style.width = progress + '%';

      if (progress > 99) {
        clearInterval(progressInterval);
      }
    }, 150);

    this.splashScreen.hide();
  }
}
