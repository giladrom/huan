import { Component, NgZone } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Platform,
  ActionSheetController,
  normalizeURL
} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';
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
import { Keyboard } from '@ionic-native/keyboard';
import { OrderTagPage } from '../order-tag/order-tag';

@IonicPage()
@Component({
  selector: 'page-add',
  templateUrl: 'add.html'
})
export class AddPage {
  @ViewChild(Slides) slides: Slides;

  scannedTagIds: { major: any; minor: any };
  imgSrc: any;
  tagAttached: boolean;
  attachText: any;
  currentLocation: any;
  breeds: any;

  private tagForm: FormGroup;
  private tag: Tag;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  constructor(
    public navCtrl: NavController,
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
    private platform: Platform,
    private keyboard: Keyboard
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z0-9\\s*]+$')
        ]
      ],
      breed: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z()\\s*]+$')
        ]
      ],
      color: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      gender: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      weight: [
        '',
        [
          //Validators.required,
          Validators.minLength(1)
        ]
      ],
      size: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      character: [
        '',
        [
          //Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ]
      //remarks: ['']
    });

    // Initialize the new tag info

    this.tag = {
      name: '',
      breed: '--',
      color: 'Brown',
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '',
      location: '',
      character: 'Friendly',
      img: normalizeURL('assets/imgs/dog-photo.png'),
      lastseen: Date.now().toString(),
      active: true,
      lost: false,
      uid: '',
      fcm_token: this.notifications.getFCMToken()
    };

    this.utils.getUserId().then(uid => {
      this.tag.uid = uid;
    });

    this.locationUtils
      .getLocation()
      .then(location => {
        this.tag.location = location.toString();
      })
      .catch(error => {
        console.error('Unable to retrieve location from LocationProvider');
      });

    this.tagAttached = false;
    this.attachText = 'Attach Huan Tag';

    this.breeds = new Array(
      '--',
      'Affenpinscher',
      'Afghan Hound',
      'Airedale Terrier',
      'Akita',
      'Alaskan Malamute',
      'American Cocker Spaniel',
      'American Eskimo Dog (Miniature)',
      'American Eskimo Dog (Standard)',
      'American Eskimo Dog (Toy)',
      'American Foxhound',
      'American Staffordshire Terrier',
      'American Water Spaniel',
      'Anatolian Shepherd',
      'Australian Cattle Dog',
      'Australian Shepherd',
      'Australian Terrier',
      'Basenji',
      'Basset Hound',
      'Beagle',
      'Bearded Collie',
      'Beauceron',
      'Bedlington Terrier',
      'Belgian Malinois',
      'Belgian Sheepdog',
      'Belgian Tervuren',
      'Bernese Mountain Dog',
      'Bichon Frise',
      'Black Russian Terrier',
      'Black and Tan Coonhound',
      'Bloodhound',
      'Border Collie',
      'Border Terrier',
      'Borzoi',
      'Boston Terrier',
      'Bouvier des Flandres',
      'Boxer',
      'Briard',
      'Brittany',
      'Brussels Griffon',
      'Bull Terrier',
      'Bulldog',
      'Bullmastiff',
      'Cairn Terrier',
      'Canaan Dog',
      'Cardigan Welsh Corgi',
      'Cavalier King Charles Spaniel',
      'Chesapeake Bay Retriever',
      'Chihuahua',
      'Chinese Crested Dog',
      'Chinese Shar-Pei',
      'Chow Chow',
      'Clumber Spaniel',
      'Collie',
      'Curly-Coated Retriever',
      'Dachshund (Miniature)',
      'Dachshund (Standard)',
      'Dalmatian',
      'Dandie Dinmont Terrier',
      'Doberman Pinscher',
      'English Cocker Spaniel',
      'English Foxhound',
      'English Setter',
      'English Springer Spaniel',
      'English Toy Spaniel',
      'Field Spaniel',
      'Finnish Spitz',
      'Flat-Coated Retriever',
      'French Bulldog',
      'German Pinscher',
      'German Shepherd Dog',
      'German Shorthaired Pointer',
      'German Wirehaired Pointer',
      'Giant Schnauzer',
      'Glen of Imaal Terrier',
      'Golden Retriever',
      'Gordon Setter',
      'Great Dane',
      'Great Pyrenees',
      'Greater Swiss Mountain Dog',
      'Greyhound',
      'Harrier',
      'Havanese',
      'Ibizan Hound',
      'Irish Setter',
      'Irish Terrier',
      'Irish Water Spaniel',
      'Irish Wolfhound',
      'Italian Greyhound',
      'Japanese Chin',
      'Keeshond',
      'Kerry Blue Terrier',
      'Komondor',
      'Kuvasz',
      'Labrador Retriever',
      'Lakeland Terrier',
      'Lhasa Apso',
      'Lowchen',
      'Maltese',
      'Manchester Terrier (Standard)',
      'Manchester Terrier (Toy)',
      'Mastiff',
      'Miniature Bull Terrier',
      'Miniature Pinscher',
      'Miniature Schnauzer',
      'Neapolitan Mastiff',
      'Newfoundland',
      'Norfolk Terrier',
      'Norwegian Elkhound',
      'Norwich Terrier',
      'Nova Scotia Duck Tolling Retriever',
      'Old English Sheepdog',
      'Otterhound',
      'Papillon',
      'Parson Russell Terrier',
      'Pekingese',
      'Pembroke Welsh Corgi',
      'Petit Basset Griffon Vendeen',
      'Pharaoh Hound',
      'Plott',
      'Pointer',
      'Polish Lowland Sheepdog',
      'Pomeranian',
      'Poodle (Miniature)',
      'Poodle (Standard)',
      'Poodle (Toy)',
      'Portuguese Water Dog',
      'Pug',
      'Puli',
      'Redbone Coonhound',
      'Rhodesian Ridgeback',
      'Rottweiler',
      'Saint Bernard',
      'Saluki (or Gazelle Hound)',
      'Samoyed',
      'Schipperke',
      'Scottish Deerhound',
      'Scottish Terrier',
      'Sealyham Terrier',
      'Shetland Sheepdog',
      'Shiba Inu',
      'Shih Tzu',
      'Siberian Husky',
      'Silky Terrier',
      'Skye Terrier',
      'Smooth Fox Terrier',
      'Soft Coated Wheaten Terrier',
      'Spinone Italiano',
      'Staffordshire Bull Terrier',
      'Standard Schnauzer',
      'Sussex Spaniel',
      'Tibetan Mastiff',
      'Tibetan Spaniel',
      'Tibetan Terrier',
      'Toy Fox Terrier',
      'Vizsla',
      'Weimaraner',
      'Welsh Springer Spaniel',
      'Welsh Terrier',
      'West Highland White Terrier',
      'Whippet',
      'Wire Fox Terrier',
      'Wirehaired Pointing Griffon',
      'Yorkshire Terrier'
    );
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
    this.keyboard.close();
    this.slides.lockSwipes(false);
    this.slides.slideNext(500);
    this.slides.lockSwipes(true);
  }

  goBack() {
    this.slides.lockSwipes(false);
    this.slides.slidePrev(500);
    this.slides.lockSwipes(true);
  }

  gotoOrderPage() {
    this.navCtrl.push(OrderTagPage);
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
              console.log('Setting img to ' + img);
              this.tag.img = img;
            });
          }
        },
        {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.getPhoto(false).then(photoUrl => {
              var img = normalizeURL(photoUrl.toString());
              console.log('Setting img to ' + img);
              this.tag.img = img;
            });
          }
        }
      ]
    });

    actionSheet.present();
  }

  save() {
    var imgUrl = this.pictureUtils.uploadPhoto().then(data => {
      console.log(data.toString());
      this.tag.img = data.toString();

      this.afs
        .collection<Tag>('Tags')
        .doc(this.tag.tagId)
        .set(this.tag)
        .then(() => {
          console.log('Successfully added tag');
        })
        .catch(error => {
          console.error('Unable to add tag: ' + JSON.stringify(error));
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
        this.attachText = 'Tag Attached';
      });
    });
  }

  getButtonClass() {
    if (this.tagAttached) {
      return 'button-full';
    } else {
      return 'button-hollow';
    }
  }
}
