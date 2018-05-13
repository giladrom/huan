import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  AlertController
} from 'ionic-angular';
import { Tag } from '../../providers/tag/tag';
import { AngularFirestore } from 'angularfire2/firestore';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ImageProvider } from '../../providers/image/image';
import { normalizeURL } from 'ionic-angular';
import { MarkerProvider } from '../../providers/marker/marker';
import { QrProvider } from '../../providers/qr/qr';
import { UtilsProvider } from '../../providers/utils/utils';

@IonicPage()
@Component({
  selector: 'page-edit',
  templateUrl: 'edit.html'
})
export class EditPage {
  private tagForm: FormGroup;

  private tag: Tag;
  private photoChanged: boolean;

  breedSelectOptions: any;
  furSelectOptions: any;
  genderSelectOptions: any;
  sizeSelectOptions: any;
  breeds: any;

  original_tagId: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    public actionSheetCtrl: ActionSheetController,
    private formBuilder: FormBuilder,
    private pictureUtils: ImageProvider,
    private markerProvider: MarkerProvider,
    private qrProvider: QrProvider,
    private utils: UtilsProvider
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z0-9\\.\\s*]+$')
        ]
      ],
      breed: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\/\\(\\)\\s*]+$')
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

    this.breedSelectOptions = {
      title: 'Choose A Breed'
      //subTitle: 'Select more than one for a mixed breed'
    };

    this.furSelectOptions = {
      title: 'Choose Fur color'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.genderSelectOptions = {
      title: 'Select Gender'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.sizeSelectOptions = {
      title: 'Choose Size'
      //ubTitle: 'Select more than one for a mixed breed'
    };

    this.breeds = new Array(
      'Mixed',
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
      breed: this.breeds[0],
      color: 'Brown',
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '',
      location: '',
      character: 'Friendly',
      img: '',
      lastseen: Date.now().toString(),
      active: true,
      lost: false,
      uid: '',
      fcm_token: '',
      markedlost: '',
      markedfound: ''
    };

    this.photoChanged = false;
  }

  ionViewWillLoad() {
    console.log('ionViewDidLoad EditPage');
    this.afs
      .collection<Tag>('Tags')
      .doc(this.navParams.data)
      .ref.get()
      .then(data => {
        this.tag = <Tag>data.data();
      });
  }

  deleteTag(tagId) {
    this.afs
      .collection<Tag>('Tags')
      .doc(tagId)
      .delete()
      .then(() => {
        this.markerProvider.deleteMarker(tagId);
      })
      .catch(error => {
        console.error('Unable to delete: ' + JSON.stringify(error));
      });
  }

  writeTagData() {
    if (this.original_tagId) {
      this.afs
        .collection<Tag>('Tags')
        .doc(this.tag.tagId)
        .set(this.tag)
        .then(() => {
          console.log('Successfully added tag with new Tag ID');
          console.log('Removing original document ' + this.original_tagId);

          this.deleteTag(this.original_tagId);
        })
        .catch(error => {
          console.error('Unable to add tag: ' + JSON.stringify(error));
        });
    } else {
      this.afs
        .collection<Tag>('Tags')
        .doc(this.navParams.data)
        .update(this.tag);
    }
  }

  save() {
    if (this.photoChanged) {
      this.pictureUtils.uploadPhoto().then(data => {
        console.log(data.toString());
        this.tag.img = data.toString();

        this.writeTagData();
      });
    } else {
      this.writeTagData();
    }

    this.markerProvider.deleteMarker(this.tag.tagId);

    this.utils.presentLoading(2500);
    setTimeout(() => {
      this.navCtrl.pop();
    }, 2000);
  }

  changeTag() {
    this.scanQR();
  }

  scanQR() {
    this.qrProvider.scan().then(() => {
      var minor = this.qrProvider.getScannedTagId().minor;

      var unsubscribe = this.afs
        .collection<Tag>('Tags')
        .doc(minor)
        .ref.onSnapshot(doc => {
          console.log('Retrieved document');

          if (doc.exists) {
            // someone already registered this tag, display an error
            this.utils.displayAlert(
              'Unable to use tag',
              'Scanned tag is already in use'
            );
          } else {
            this.utils.displayAlert('Tag changed successfully');

            this.original_tagId = this.tag.tagId;

            this.tag.tagId = minor;
          }

          unsubscribe();
        });
    });
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
              this.tag.img = normalizeURL(photoUrl.toString());
              this.photoChanged = true;
            });
          }
        },
        {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.getPhoto(false).then(photoUrl => {
              this.tag.img = normalizeURL(photoUrl.toString());
              this.photoChanged = true;
            });
          }
        }
      ]
    });

    actionSheet.present();
  }

  delete() {
    let confirm = this.alertCtrl.create({
      title: 'Delete ' + this.tag.name,
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Delete',
          handler: () => {
            this.afs
              .collection<Tag>('Tags')
              .doc(this.tag.tagId)
              .delete()
              .then(() => {
                this.markerProvider.deleteMarker(this.tag.tagId);

                this.navCtrl.pop();
              })
              .catch(error => {
                console.error('Unable to delete: ' + JSON.stringify(error));
              });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
  }
}
