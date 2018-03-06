import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, ActionSheetController } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { AngularFireModule } from 'angularfire2';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Tag, TagProvider } from '../../providers/tag/tag';
import { ImageProvider } from '../../providers/image/image';
import { LocationProvider } from '../../providers/location/location';
import { AngularFireAuth } from 'angularfire2/auth';
import { QrProvider } from '../../providers/qr/qr';


/**
 * Generated class for the AddPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-add',
  templateUrl: 'add.html',
})
export class AddPage {
  scannedTagIds: { "major": any; "minor": any; };
  imgSrc: any;
  tagAttached: boolean;
  attachText: any;
  currentLocation: any;

  private tag: FormGroup;
  tagCollectionRef: AngularFirestoreCollection<Tag>;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private afs: AngularFirestore,
    private actionSheetCtrl: ActionSheetController,
    private pictureUtils: ImageProvider,
    private locationUtils: LocationProvider,
    private tagProvider: TagProvider,
    public zone: NgZone,
    public afAuth: AngularFireAuth,
    private qrscan: QrProvider) {

    // Set up form validators

    this.tag = this.formBuilder.group({
      'name': ['', Validators.required],
      /*
      'tagId': ['', [
        Validators.required,
        Validators.maxLength(4),
        Validators.minLength(1),
        Validators.pattern("[A-Fa-f0-9]+")
        ]],
      */
      'breed': ['', Validators.required],
      'color': ['', Validators.required],
      //'location': ['', Validators.required],
    });

    this.tagAttached = false;
    this.attachText = 'Attach Huan Tag';
    this.currentLocation = '';
  }

  populateLocation() {
    this.locationUtils.getLocationName().then(locationStr => {
      console.log("Setting location to " + JSON.stringify(locationStr[0].locality));
      this.tag.value.location = locationStr[0].locality + ', ' + locationStr[0].administrativeArea;
    })
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AddPage');
    this.imgSrc = '../../assets/imgs/dog-photo.png';
    this.populateLocation();
  }


  addTagToDatabase() {
    var uid = this.afAuth.auth.currentUser.uid;

    this.tagCollectionRef = this.afs.collection<Tag>('Tags');

    var utc = Date.now().toString();

    // Add the new tag info to the Database
    this.locationUtils.getLocation().then((loc) => {
      this.tagCollectionRef
        .doc(this.scannedTagIds.minor)
        .set(
          {
            name: this.tag.value.name,
            tagId: this.scannedTagIds.minor,
            breed: this.tag.value.breed,
            color: this.tag.value.color,
            location: loc,
            img: this.imgSrc,
            lastseen: utc,
            active: true,
            lost: false,
            uid: uid,
            fcm_token: this.tagProvider.getFCMToken() || ''
          }
        )
    })

    this.navCtrl.pop();
  }

  changePicture() {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      buttons: [
        {
          text: 'Take a picture',
          icon: 'camera',
          handler: () => {
            var photoUrl = this.pictureUtils.takePhoto();
            this.zone.run(() => {
              console.log("Setting imgSrc to: " + photoUrl);
              this.imgSrc = photoUrl;
            })


          }
        }, {
          text: 'From gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.selectPhoto().then(photoUrl => {
              this.zone.run(() => {
                console.log("Setting imgSrc to: " + photoUrl);
                this.imgSrc = photoUrl;
              })
            });

            console.log("imgSrc: " + this.imgSrc);

          }
        }
      ]
    });

    actionSheet.present();
  }

  scanQR() {
    this.qrscan.scan().then(() => {
      this.scannedTagIds = this.qrscan.getScannedTagId();

      // Only use Minor tag ID for now
      this.zone.run(() => {
        console.log("Successfully scanned tag. ID: " + this.scannedTagIds.minor);
        this.tagAttached = true;
        this.attachText = "Tag Attached";
      })
    })
  }

  getButtonClass() {
    if (this.tagAttached) {
      return 'button-full';
    } else {
      return 'button-hollow';
    }
  }
}
