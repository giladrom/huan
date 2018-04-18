import { Component, NgZone } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, ActionSheetController, normalizeURL } from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Tag, TagProvider } from '../../providers/tag/tag';
import { ImageProvider } from '../../providers/image/image';
import { LocationProvider } from '../../providers/location/location';
import { AngularFireAuth } from 'angularfire2/auth';
import { QrProvider } from '../../providers/qr/qr';
import { UtilsProvider } from '../../providers/utils/utils';
import { NotificationProvider } from '../../providers/notification/notification';
import { ViewChild } from '@angular/core';
import { Slides } from 'ionic-angular';

import { NameValidator } from '../../validators/name.validator';


@IonicPage()
@Component({
  selector: 'page-add',
  templateUrl: 'add.html',
})
export class AddPage {
  @ViewChild(Slides) slides: Slides;

  scannedTagIds: { "major": any; "minor": any; };
  imgSrc: any;
  tagAttached: boolean;
  attachText: any;
  currentLocation: any;

  private tagForm: FormGroup;
  private tag: Tag;

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
    private qrscan: QrProvider,
    private utils: UtilsProvider,
    private notifications: NotificationProvider,
    private platform: Platform) {

    // Set up form validators

    this.tagForm = this.formBuilder.group({
      'name': ['', [ Validators.required, , Validators.minLength(2) ]],
      'breed': ['', Validators.required],
      'color': ['', Validators.required],
      'gender': ['', Validators.required],
      'weight': ['', Validators.required],
      'size': ['', Validators.required],
      'character': ['', Validators.required],
      'remarks': ['', Validators.required],
    });

    // Initialize the new tag info

    this.tag = {
      name: '',
      breed: 'Labrador',
      color: 'White',
      gender: 'Male',
      remarks: 'None',
      weight: '20',
      size: 'Large',
      tagId: '',
      location: '',
      character: '',
      img: '../../assets/imgs/dog-photo.png',
      lastseen: Date.now().toString(),
      active: true,
      lost: false,
      uid: '',
      fcm_token: this.notifications.getFCMToken()
    }

    this.utils.getUserId().then((uid) => {
      this.tag.uid = uid;
    });

    this.locationUtils.getLocation().then(location => {
      this.tag.location = location.toString();
    }).catch(error => {
      console.error("Unable to retrieve location from LocationProvider");
    });

    this.tagAttached = false;
    this.attachText = 'Attach Huan Tag';

  }

  gotoAddPictureSlide() {
    this.slides.lockSwipes(false);
    this.slides.slideTo(1, 500);
    this.slides.lockSwipes(true);
  }

  gotoAddTagSlide() {
    this.slides.lockSwipes(false);
    this.slides.slideTo(2, 500);
    this.slides.lockSwipes(true);
  }

  gotoInfoSlide() {
    this.slides.lockSwipes(false);
    this.slides.slideTo(3, 500);
    this.slides.lockSwipes(true);

  }

  gotoRemarksSlide() {
    this.slides.lockSwipes(false);
    this.slides.slideTo(4, 500);
    this.slides.lockSwipes(true);

  }

  goForward() {
    this.slides.lockSwipes(false);
    this.slides.slideNext(500);
    this.slides.lockSwipes(true);    
  }

  goBack() {
    this.slides.lockSwipes(false);
    this.slides.slidePrev(500);
    this.slides.lockSwipes(true);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AddPage');
    this.slides.lockSwipes(true);

  }

  changePicture() {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      buttons: [
        {
          text: 'Take a picture',
          icon: 'camera',
          handler: () => {
            this.pictureUtils.getPhoto(true).then(photoUrl => {
              var img = normalizeURL(photoUrl.toString());
              console.log("Setting img to " + img);
              this.tag.img = img;
            });
          }
        }, {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.getPhoto(false).then(photoUrl => {
              var img = normalizeURL(photoUrl.toString());
              console.log("Setting img to " + img);
              this.tag.img = img;
            });
          }
        }
      ]
    });

    actionSheet.present();
  }

  save() {
    var imgUrl = this.pictureUtils.uploadPhoto().then((data) => {
      console.log(data.toString());
      this.tag.img = data.toString();

      this.afs.collection<Tag>('Tags').doc(this.tag.tagId).set(this.tag).then(() => {
        console.log("Successfully added tag");
      })
        .catch((error) => {
          console.error("Unable to add tag: " + JSON.stringify(error));
        });
    });

    this.navCtrl.pop();
  }


  scanQR() {
    this.qrscan.scan().then(() => {
      this.tag.tagId = this.qrscan.getScannedTagId().minor;

      // Only use Minor tag ID for now
      this.zone.run(() => {
        //console.log("Successfully scanned tag. ID: " + this.scannedTagIds.minor);
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
