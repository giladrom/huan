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
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';
import { MarkerProvider } from '../../providers/marker/marker';
import { CallNumber } from '@ionic-native/call-number';
import { SMS } from '@ionic-native/sms';

@IonicPage()
@Component({
  selector: 'page-show',
  templateUrl: 'show.html'
})
export class ShowPage implements OnDestroy {
  private location: LatLng;

  private tagItem$: Observable<Tag>;
  private name = '';
  private tagId;

  private anonymous;

  private subscription;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  markAsText: string;
  shareContactInfo: any = false;
  displayName: any;
  phoneNumber: any;

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
    private callNumber: CallNumber,
    private sms: SMS
  ) {}

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
      .flatMap(result => result);

    this.subscription = this.tagItem$.subscribe(data => {
      if (data.lost) {
        this.markAsText = 'Mark as Found';
        this.isLost = false;
      } else {
        this.markAsText = 'Mark as Lost';
        this.isLost = true;
      }

      var loc = data.location.split(',');
      this.location = new LatLng(Number(loc[0]), Number(loc[1]));
      this.name = data.name;

      // if (this.anonymous) {
      var unsubscribe = this.afs
        .collection('Users')
        .doc(data.uid)
        .ref.onSnapshot(doc => {
          unsubscribe();

          if (doc.exists) {
            this.shareContactInfo = doc.data().settings.shareContactInfo;

            if (this.shareContactInfo == true) {
              this.displayName = doc.data().account.displayName;
              this.phoneNumber = doc.data().account.phoneNumber;
            }
          }
        });
      // }
    });
  }

  contactOwners() {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      title: 'Contact Owners (' + this.displayName + ')',
      buttons: [
        {
          text: 'Call',
          // icon: 'call',
          handler: () => {
            this.callNumber.callNumber(this.phoneNumber, true);
          }
        },
        {
          text: 'Send a Message',
          // icon: 'text',
          handler: () => {
            this.sms
              .send(this.phoneNumber, 'Hi! I just found your pet!')
              .catch(error => {
                console.error('Unable to send Message to ' + this.phoneNumber);
              });
          }
        }
      ]
    });

    actionSheet.present();
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
                    markedlost: Date.now()
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
                    markedfound: Date.now()
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
