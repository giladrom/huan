import { Component, ViewChild, ElementRef } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Platform,
  AlertController,
  ActionSheetController,
  ViewController
} from 'ionic-angular';
//import { HomePage } from '../home/home'
import { Tag } from '../../providers/tag/tag';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';

// Google Maps API
import {
  GoogleMaps,
  GoogleMap,
  LatLng,
  GoogleMapsEvent,
  GoogleMapsMapTypeId
} from '@ionic-native/google-maps';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/mergeMap';
import { EditPage } from '../edit/edit';
import { MarkerProvider } from '../../providers/marker/marker';

@IonicPage()
@Component({
  selector: 'page-show',
  templateUrl: 'show.html'
})
export class ShowPage {
  @ViewChild('map') mapElement: ElementRef;
  map: GoogleMap;
  private location: LatLng;

  private tagItem$: Observable<Tag>;
  private name = '';
  private tagId;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  markAsText: string;
  isLost: boolean = false;

  constructor(
    public viewCtrl: ViewController,
    public navCtrl: NavController,
    public navParams: NavParams,
    private platform: Platform,
    private googleMaps: GoogleMaps,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    public actionSheetCtrl: ActionSheetController,
    private markerProvider: MarkerProvider
  ) {}

  ionViewDidLoad() {
    this.tagId = this.navParams.data.tagId;

    this.tagItem$ = this.afs
      .collection<Tag>('Tags', ref =>
        ref.where('tagId', '==', this.tagId).limit(1)
      )
      .valueChanges()
      .flatMap(result => result);

    this.tagItem$.subscribe(data => {
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
    });
  }

  edit() {
    this.navCtrl.push(EditPage, this.tagId);
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
