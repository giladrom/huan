import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, AlertController, ActionSheetController } from 'ionic-angular';
//import { HomePage } from '../home/home'
import { Tag } from '../../providers/tag/tag';

//import { AngularFireModule } from 'angularfire2';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';

// Google Maps API
import {
  GoogleMaps,
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMapsMapTypeId,
} from '@ionic-native/google-maps';
//import { AngularFireAuth } from 'angularfire2/auth';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';
import { EditPage } from '../edit/edit';

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
  map: GoogleMap;
  private location: LatLng;

  private tagItem$: Observable<Tag>;
  private name = '';

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  markAsText: string;
  isLost: boolean = false;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private platform: Platform,
    private googleMaps: GoogleMaps,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    public actionSheetCtrl: ActionSheetController) {

  }

  ionViewDidLoad() {
    //this.platform.ready().then(() => {
    //var uid = this.utils.getUserId();

    this.tagItem$ = this.afs.collection<Tag>('Tags',
      ref => ref.where('tagId', '==', this.navParams.data).limit(1)).
      valueChanges().flatMap(result => result);

    this.tagItem$.subscribe((data) => {
      if (data.lost) {
        this.markAsText = "Mark as Found";
        this.isLost = false;
      } else {
        this.markAsText = "Mark as Lost";
        this.isLost = true;
      }

      var loc = data.location.split(',');
      this.location = new LatLng(Number(loc[0]), Number(loc[1]));
      this.name = data.name;

      let element = this.mapElement.nativeElement;
      this.map = this.googleMaps.create(element);

      if (this.map !== undefined) {
        this.map.one(GoogleMapsEvent.MAP_READY).then(() => {
          this.map.setOptions({
            'mapType': GoogleMapsMapTypeId.NORMAL,
            'controls': {
              'compass': false,
              'myLocationButton': false,
              'indoorPicker': false,
              'zoom': false
            },
            'gestures': {
              'scroll': false,
              'tilt': false,
              'rotate': false,
              'zoom': false
            },
          });

          let options = {
            target: this.location,
            zoom: 15
          };

          this.map.moveCamera(options);
          this.addMarker();
        });
      }
    })

    //});
  }

  edit() {
    this.navCtrl.push(EditPage, this.navParams.data);
  }

  addMarker() {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Get Directions',
      buttons: [
        {
          text: 'Open in Apple Maps',
          handler: () => {
            window.open('maps:?q=' + this.location.lat + ',' + this.location.lng, '_system');
            actionSheet.dismiss();
          }
        },
        {
          text: 'Open in Google Maps',
          handler: () => {
            window.open('comgooglemaps://?daddr=' + this.location.lat + ',' + this.location.lng, '_system');
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

  markAsFunc() {
    if (!this.isLost) {
      this.markAsFound();
    } else {
      this.markAsLost();
    }
  }

  markAsLost() {
    console.log("Mark As Lost clicked");

    this.afs.collection<Tag>('Tags').doc(this.navParams.data).ref.get().then((data) => {
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
              this.afs.collection<Tag>('Tags').doc(data.get('tagId')).update({ lost: true });
            }
          }
        ],
        cssClass: 'alertclass'
      });

      confirm.present();
    })
  }

  markAsFound() {
    this.afs.collection<Tag>('Tags').doc(this.navParams.data).ref.get().then((data) => {
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
              this.afs.collection<Tag>('Tags').doc(data.get('tagId')).update({ lost: false });
            }
          }
        ],
        cssClass: 'alertclass'
      });

      confirm.present();
    })
  }

  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }
}
