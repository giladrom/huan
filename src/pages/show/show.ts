import { mergeMap } from 'rxjs/operators';
import { Component, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController,
  ActionSheetController,
  ViewController
} from 'ionic-angular';
import { Tag } from '../../providers/tag/tag';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';

// Google Maps API
import { LatLng } from '@ionic-native/google-maps';
import { Observable } from 'rxjs';

import { MarkerProvider } from '../../providers/marker/marker';
import { SMS } from '@ionic-native/sms';
import firebase from 'firebase';
import { LocationProvider } from '../../providers/location/location';

@IonicPage()
@Component({
  selector: 'page-show',
  templateUrl: 'show.html'
})
export class ShowPage implements OnDestroy {
  private location: LatLng;
  private locationName;

  private tagItem$: Observable<Tag>;
  private name = '';
  private lostSince = '';
  private tagId;

  private anonymous;

  private subscription;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  markAsText: string;
  shareContactInfo: any = false;
  displayName: any;
  phoneNumber: any;
  owners: Array<any>;

  isLost: boolean = false;

  constructor(
    public viewCtrl: ViewController,
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    public actionSheetCtrl: ActionSheetController,
    private markerProvider: MarkerProvider,
    private sms: SMS,
    private locationProvider: LocationProvider
  ) {
    this.owners = new Array();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ionViewWillLoad() {
    this.tagId = this.navParams.data.tagId;
    this.anonymous = this.navParams.data.anonymous;

    this.tagItem$ = this.afs
      .collection<Tag>('Tags', ref =>
        ref.where('tagId', '==', this.tagId).limit(1)
      )
      .valueChanges()
      .pipe(mergeMap(result => result));

    this.subscription = this.tagItem$.subscribe(data => {
      this.subscription.unsubscribe();

      if (data.lost) {
        this.markAsText = 'Mark as Found';
        this.isLost = false;
      } else {
        this.markAsText = 'Mark as Lost';
        this.isLost = true;
      }

      var loc = data.location.split(',');
      this.location = new LatLng(Number(loc[0]), Number(loc[1]));

      this.locationProvider.getLocationName(this.location).then(loc => {
        this.locationProvider.getTownName(this.location).then(town => {
          this.locationName = `${loc}, ${town}`;
        });
      });

      this.name = data.name;
      var ml: any = data.markedlost;
      this.lostSince = this.utils.getLastSeen(ml.toDate());

      // if (this.anonymous) {
      if (data.uid instanceof Array) {
        data.uid.forEach(owner => {
          console.log('Retrieving owner info for item ' + owner);

          var unsubscribe = this.afs
            .collection('Users')
            .doc(owner.toString())
            .ref.onSnapshot(doc => {
              unsubscribe();

              if (doc.exists) {
                console.warn('Doc exists');
                // this.shareContactInfo = doc.data().settings.shareContactInfo;

                if (doc.data().settings.shareContactInfo === true) {
                  this.owners.push({
                    displayName: doc.data().account.displayName,
                    phoneNumber: doc.data().account.phoneNumber,
                    shareContactInfo: doc.data().settings.shareContactInfo
                  });

                  // this.displayName = doc.data().account.displayName;
                  // this.phoneNumber = doc.data().account.phoneNumber;
                }
              }
            });
        });
      } else {
        console.log('Retrieving owner info for ' + data.uid);

        var unsubscribe = this.afs
          .collection('Users')
          .doc(data.uid)
          .ref.onSnapshot(doc => {
            unsubscribe();

            if (doc.exists) {
              this.shareContactInfo = doc.data().settings.shareContactInfo;

              if (doc.data().settings.shareContactInfo === true) {
                this.owners.push({
                  displayName: doc.data().account.displayName,
                  phoneNumber: doc.data().account.phoneNumber,
                  shareContactInfo: doc.data().settings.shareContactInfo
                });
                // this.displayName = doc.data().account.displayName;
                // this.phoneNumber = doc.data().account.phoneNumber;
              }
            }
          });
      }
      // }
    });
  }

  contactOwners(name, number) {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      title: 'Contact Owners (' + name + ')',
      buttons: [
        // {
        //   text: 'Call',
        //   // icon: 'call',
        //   handler: () => {
        //     this.callNumber.callNumber(number, true);
        //   }
        // },
        {
          text: 'Send a Message',
          // icon: 'text',
          handler: () => {
            this.sms
              .send(number, 'Hi! I just found ' + this.name + '!')
              .catch(error => {
                console.error('Unable to send Message to ' + number);
              });
          }
        }
      ]
    });

    actionSheet.present();
  }

  getMarkedLostSubtitle(markedlost) {
    return this.utils.getLastSeen(markedlost.toDate());
  }

  edit() {
    this.navCtrl.push('EditPage', this.tagId);
  }

  markAsFunc() {
    if (!this.isLost) {
      this.markAsFound();
    } else {
      this.markAsLost();
    }
  }

  markAsLost() {
    console.log('Mark As Lost clicked');

    this.afs
      .collection<Tag>('Tags')
      .doc(this.tagId)
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
                this.afs
                  .collection<Tag>('Tags')
                  .doc(data.get('tagId'))
                  .update({
                    lost: true,
                    markedlost: firebase.firestore.FieldValue.serverTimestamp()
                  });

                this.markerProvider.deleteMarker(this.tagId);
                this.viewCtrl.dismiss().then(() => {
                  console.log('Popover dismissed');
                });
              }
            }
          ],
          cssClass: 'alertclass'
        });

        confirm.present();
      });
  }

  markAsFound() {
    this.afs
      .collection<Tag>('Tags')
      .doc(this.tagId)
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
                this.afs
                  .collection<Tag>('Tags')
                  .doc(data.get('tagId'))
                  .update({
                    lost: false,
                    markedfound: firebase.firestore.FieldValue.serverTimestamp()
                  });

                this.markerProvider.deleteMarker(this.tagId);
                this.viewCtrl.dismiss().then(() => {
                  console.log('Popover dismissed');
                });
              }
            }
          ],
          cssClass: 'alertclass'
        });

        confirm.present();
      });
  }

  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }
}
