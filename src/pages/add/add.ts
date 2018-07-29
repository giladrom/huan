import { Component, NgZone } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  normalizeURL,
  LoadingController
} from 'ionic-angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';
import { Tag } from '../../providers/tag/tag';
import { ImageProvider } from '../../providers/image/image';
import { LocationProvider } from '../../providers/location/location';
import { AngularFireAuth } from 'angularfire2/auth';
import { QrProvider } from '../../providers/qr/qr';
import { UtilsProvider } from '../../providers/utils/utils';
import { NotificationProvider } from '../../providers/notification/notification';
import { ViewChild } from '@angular/core';
import { Slides } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { AuthProvider } from '../../providers/auth/auth';

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
  colors: any;
  breedSelectOptions: any;
  furSelectOptions: any;
  genderSelectOptions: any;
  sizeSelectOptions: any;
  imageChanged: boolean;

  private tagForm: FormGroup;
  private tag: Tag;
  private loader;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private afs: AngularFirestore,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private pictureUtils: ImageProvider,
    private locationUtils: LocationProvider,
    public zone: NgZone,
    public afAuth: AngularFireAuth,
    private qrscan: QrProvider,
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider,
    private notifications: NotificationProvider,
    private keyboard: Keyboard
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          Validators.pattern('^[a-zA-Z0-9\\s*]+$')
        ]
      ],
      breed: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.pattern('^[a-zA-Z\\/\\(\\)\\,\\s*]+$')
        ]
      ],
      color: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.pattern('^[a-zA-Z\\,\\s*]+$')
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

    this.imageChanged = false;

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

    this.breedSelectOptions = {
      title: 'Breed'
      //subTitle: 'Select more than one for a mixed breed'
    };

    this.furSelectOptions = {
      title: 'Fur color'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.genderSelectOptions = {
      title: 'Gender'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.sizeSelectOptions = {
      title: 'Size'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.colors = new Array(
      'Yellow',
      'Brown',
      'White',
      'Grey',
      'Black',
      'Cream',
      'Tan',
      'Brindle',
      'Red',
      'Gold',
      'Blue',
      'Bicolor',
      'Tricolor',
      'Merle',
      'Tuxedo',
      'Harlequin',
      'Spotted',
      'Flecked',
      'Saddle',
      'Sable'
    );

    this.breeds = new Array(
      // Cat Breeds

      'Mixed Cat breed',
      'Abyssinian',
      'Burmese',
      'Egyptian Mau',
      'Himalayan',
      'Maine Coon',
      'Manx',
      'Persian',
      'Cornish Rex',
      'Devon Rex',
      'Russian Blue',
      'Siamese',

      // Dog Breeds

      'Mixed Dog breed',
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
      'Korean Jindo',
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
      'Pit Bull',
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

    // Initialize the new tag info

    this.tag = {
      name: '',
      breed: this.breeds[12],
      color: this.colors[1],
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '0',
      location: '',
      character: 'Friendly',
      img:
        'https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/App_Assets%2Fdog-photo.png?alt=media&token=9e35aff7-dbb1-4ac8-b22a-869301add0d6',
      lastseen: Date.now().toString(),
      lastseenBy: '',
      active: true,
      lost: false,
      uid: '',
      fcm_token: this.notifications.getFCMToken(),
      markedlost: '',
      markedfound: '',
      hw: {
        batt: '-1'
      },
      tagattached: false
    };

    this.authProvider.getUserId().then(uid => {
      this.tag.uid = uid;
    });

    this.pictureUtils.setPhoto(this.tag.img);
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
    this.navCtrl.push('OrderTagPage');
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
            this.pictureUtils
              .getPhoto(true)
              .then(photoUrl => {
                var img = normalizeURL(photoUrl.toString());
                console.log('Setting img to ' + img);
                this.tag.img = img;
                this.imageChanged = true;
              })
              .catch(e => {
                console.error('Could not take photo: ' + JSON.stringify(e));
              });
          }
        },
        {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils
              .getPhoto(false)
              .then(photoUrl => {
                var img = normalizeURL(photoUrl.toString());
                console.log('Setting img to ' + img);
                this.tag.img = img;
                this.imageChanged = true;
              })
              .catch(e => {
                console.error('Could not get photo: ' + JSON.stringify(e));
              });
          }
        }
      ]
    });

    actionSheet.present();
  }

  findRandomTagId(): Promise<any> {
    return new Promise((resolve, reject) => {
      let tagId = this.utilsProvider.randomIntFromInterval(9000, 9999);

      console.log(`Checking if temporary ID ${tagId} is taken...`);

      var unsubscribe = this.afs
        .collection<Tag>('Tags')
        .doc(tagId.toString())
        .ref.onSnapshot(doc => {
          if (!doc.exists) {
            console.log(`${tagId} is available. Proceeding...`);
            resolve(tagId);
          } else {
            console.log(`${tagId} is taken. trying again...`);

            resolve(this.findRandomTagId());
          }

          unsubscribe();
        });
    });
  }

  async save() {
    this.showLoading();

    let tagId = await this.findRandomTagId();

    this.pictureUtils
      .uploadPhoto()
      .then(data => {
        console.log(data.toString());
        this.tag.img = data.toString();
        this.tag.tagId = tagId.toString();

        this.afs
          .collection<Tag>('Tags')
          .doc(tagId.toString())
          .set(this.tag)
          .then(() => {
            this.dismissLoading();
            console.log('Successfully added tag');
          })
          .catch(error => {
            this.dismissLoading();
            console.error('Unable to add tag: ' + JSON.stringify(error));
          });
      })
      .catch(e => {
        this.dismissLoading();
        console.error('Could not upload photo: ' + JSON.stringify(e));
      });

    this.navCtrl.pop();
  }

  scanQR() {
    var loader = this.utilsProvider.presentLoading(30000);

    this.qrscan
      .scan()
      .then(() => {
        var minor = this.qrscan.getScannedTagId().minor;

        console.log('Searching for tag ' + minor);

        var unsubscribe = this.afs
          .collection<Tag>('Tags')
          .doc(minor)
          .ref.onSnapshot(doc => {
            console.log('Retrieved document');

            loader.dismiss();

            if (doc.exists) {
              // someone already registered this tag, display an error
              this.utilsProvider.displayAlert(
                'Unable to use tag',
                'Scanned tag is already in use'
              );
            } else {
              this.tag.tagId = minor;
              this.tagAttached = true;
              this.attachText = 'Tag Attached';
            }

            unsubscribe();
          });
      })
      .catch(error => {
        loader.dismiss();

        console.error('scanQR: ' + error);
      });
  }

  getButtonClass() {
    if (this.tagAttached) {
      return 'button-full';
    } else {
      return 'button-hollow';
    }
  }

  onBreedChange() {
    console.log('Breed Changed: ' + JSON.stringify(this.tag.breed));

    let index = -1;

    this.tag.breed.forEach(breed => {
      console.log('index: ' + index + 'indexOf: ' + this.breeds.indexOf(breed));

      if (index >= 0 && index <= 11 && this.breeds.indexOf(breed) > 11) {
        this.utilsProvider.displayAlert(
          'Creating Cat/Dog hybrids is not supported at the moment.',
          "Let's hope it never is."
        );
        this.tagForm.get('breed').setErrors({ invalid: true });
      }

      index = this.breeds.indexOf(breed);
    });
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: 'Please Wait...'
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
  }
}
