import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, AlertController, ActionSheetController } from 'ionic-angular';
import { HomePage } from '../home/home'
import { Tag } from '../../providers/tag/tag';

import { AngularFireModule } from 'angularfire2';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';

// Google Maps API
import {
  GoogleMaps,
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
} from '@ionic-native/google-maps';
import { AngularFireAuth } from 'angularfire2/auth';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';

/**
 * Generated class for the ShowPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-show',
  templateUrl: 'show.html',
})
export class ShowPage {
  @ViewChild('map') mapElement: ElementRef;
  private map: GoogleMap;
  private location: LatLng;

  private tagItem$: Observable<Tag>;
  private name = '';

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private platform: Platform,
    private googleMaps: GoogleMaps,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    private afAuth: AngularFireAuth,
    public actionSheetCtrl: ActionSheetController) {

    var uid = afAuth.auth.currentUser.uid;

    this.tagItem$ = this.afs.collection<Tag>('Tags',
      ref => ref.where('tagId', '==', this.navParams.data).limit(1)).
      valueChanges().flatMap(result => result);

    this.tagItem$.subscribe((data) => {
      var loc = data.location.split(',');
      this.location = new LatLng(Number(loc[0]), Number(loc[1]));
      this.name = data.name;

    })
  }

  ionViewDidLoad() {
    this.platform.ready().then(() => {

      let element = this.mapElement.nativeElement;
      this.map = this.googleMaps.create(element);

      this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
        let options = {
          target: this.location,
          zoom: 15
        };

        this.map.moveCamera(options);
        this.addMarker();
      });
    });
  }

  addMarker() {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Get Directions',
      buttons: [
        {
          text: 'Open in Apple Maps',
          handler: () => {
            var ref = window.open('maps:?q=' + this.location.lat + ',' + this.location.lng, '_system');
            actionSheet.dismiss();
          }
        },
        {
          text: 'Open in Google Maps',
          handler: () => {
            var ref = window.open('comgooglemaps://?daddr=' + this.location.lat + ',' + this.location.lng, '_system');
            actionSheet.dismiss();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });

      this.map.addMarker({
        title: this.name,
        icon: 'red',
        animation: 'DROP',
        position: {
          lat: this.location.lat,
          lng: this.location.lng
        }
      })
        .then(marker => {
          marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
            //actionSheet.present();
            if (this.platform.is('ios')) {
              window.open('maps:?q=' + this.location.lat + ',' + this.location.lng, '_system');
            }

            if (this.platform.is('android')) {
              window.open('geo:?daddr=' + this.location.lat + ',' + this.location.lng, '_system');
            }

          });
        });
  }

  markAsLost() {
    this.tagItem$.subscribe((data) => {
      let confirm = this.alertCtrl.create({
        title: 'Mark ' + data.name + ' as lost',
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
              //console.log("Marking " + this.tagItem.name + " as lost!");
              this.tagCollectionRef.doc(data.id).update({ lost: true });
              this.navCtrl.pop();

            }
          }
        ]
      });

      confirm.present();
    })
  }

  markAsFound() {
    this.tagItem$.subscribe((data) => {
      let confirm = this.alertCtrl.create({
        title: 'Mark ' + data.name + ' as found',
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
              //console.log("Marking " + this.tagItem.name + " as found!");
              this.tagCollectionRef.doc(data.id).update({ lost: false });
              this.navCtrl.pop();

            }
          }
        ]
      });

      confirm.present();
    })
  }

  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }
}
