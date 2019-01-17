import { Component, NgZone } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  LoadingController,
  App,
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
import { Keyboard } from '@ionic-native/keyboard';
import { AuthProvider } from '../../providers/auth/auth';
import { SelectSearchableComponent } from 'ionic-select-searchable';
import { MarkerProvider } from '../../providers/marker/marker';
import { WebView } from '@ionic-native/ionic-webview/ngx';
import { DomSanitizer } from '@angular/platform-browser';

import firebase from 'firebase';
import { HttpClient } from '@angular/common/http';

@IonicPage()
@Component({
  selector: 'page-add',
  templateUrl: 'add.html'
})
export class AddPage {
  @ViewChild(Slides)
  slides: Slides;

  scannedTagIds: { major: any; minor: any };
  imgSrc: any;
  tagAttached: boolean;
  attachText: any;
  currentLocation: any;
  breeds: Array<any>;
  colors: Array<any>;
  characters: Array<any>;
  breedSelectOptions: any;
  furSelectOptions: any;
  genderSelectOptions: any;
  sizeSelectOptions: any;
  characterSelectOptions: any;
  imageChanged: boolean;

  private tagForm: FormGroup;
  private tag: Tag;
  private loader;

  tagCollectionRef: AngularFirestoreCollection<Tag>;

  dropDownConfig: any = {
    displayKey: 'description',
    height: '300px',
    search: true,
    placeholder: 'Select Breed'
    // limitTo: this.options.length,
    // customComparator:
  };
  private win: any = window;

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
    private notificationProvider: NotificationProvider,
    private keyboard: Keyboard,
    private tagProvider: TagProvider,
    private webview: WebView,
    private domSanitizer: DomSanitizer,
    private http: HttpClient,
    private app: App,
    private markerProvider: MarkerProvider
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30)
          // Validators.pattern('^[a-zA-Z0-9\\-\\s*]+$')
        ]
      ],
      breed: [
        '',
        [
          // Validators.required
          // Validators.minLength(1)
          // Validators.pattern('^[a-zA-Z\\/\\(\\)\\,\\-\\s*]+$')
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
      ],
      remarks: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(300)
          // Validators.pattern('^[a-zA-Z0-9\\.\\,\\-\\!\\(\\)\\[\\]\\"\\"\\s*]+$')
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

    this.characterSelectOptions = {
      title: 'Character'
    };

    this.colors = this.tagProvider.getFurColors();

    this.breeds = this.tagProvider.getDogBreeds();

    this.breeds = this.breeds.concat(this.tagProvider.getCatBreeds());

    this.characters = this.tagProvider.getCharacters();

    // Initialize the new tag info

    this.tag = {
      name: '',
      breed: this.breeds[105],
      color: this.colors[1],
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '0',
      location: '',
      character: 'Friendly',
      // img:
      //   'https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/App_Assets%2Fdog-photo.png?alt=media&token=9e35aff7-dbb1-4ac8-b22a-869301add0d6',
      lastseen: firebase.firestore.FieldValue.serverTimestamp(),
      img: normalizeURL('assets/imgs/dog.jpeg'),
      lastseenBy: '',
      active: true,
      lost: false,
      uid: '',
      fcm_token: '',
      markedlost: '',
      markedfound: '',
      hw: {
        batt: '-1'
      },
      tagattached: false,
      order_status: 'none'
    };

    this.authProvider.getUserId().then(uid => {
      const uidArray = [uid];
      this.tag.uid = uidArray;

      this.tag.fcm_token = new Array();
      this.tag.fcm_token.push({
        uid: uid,
        token: this.notificationProvider.getFCMToken()
      });
    });

    this.pictureUtils.setPhoto(this.tag.img);
  }

  breedChange(event: { component: SelectSearchableComponent; value: any }) {
    console.log('breed: ', event.value);
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
    this.keyboard.hide();
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
              .then(photo => {
                console.log(photo);
                window.document
                  .getElementById('#image')
                  .setAttribute('src', photo.toString());

                // this.tag.img = <string>photo;
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
              .then(photo => {
                console.log(photo);
                window.document
                  .getElementById('#image')
                  .setAttribute('src', photo.toString());

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

  getLocalImage(img): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http
        .get(img, {
          observe: 'response',
          responseType: 'blob'
        })
        .subscribe(
          data => {
            console.log('Received image data: ' + data.body.toString());
            resolve(data.body);
          },
          error => {
            console.error('this.http.get: ' + JSON.stringify(error));
            reject(error);
          }
        );
    });
  }

  async save() {
    this.showLoading();

    let tagId = await this.findRandomTagId();

    if (this.imageChanged) {
    }

    this.pictureUtils
      .uploadPhoto(
        this.imageChanged ? null : await this.getLocalImage(this.tag.img)
      )
      .then(data => {
        console.log('save(): image url: ' + data.toString());
        this.tag.img = data.toString();
        this.tag.tagId = tagId.toString();

        this.afs
          .collection<Tag>('Tags')
          .doc(tagId.toString())
          .set(this.tag)
          .then(() => {
            this.dismissLoading();
            console.log('Successfully added tag');

            this.markerProvider.addPetMarker(this.tag, true);
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

    // this.dismissLoading();
    await this.backToMyPets();
  }

  backToMyPets(): Promise<any> {
    return new Promise((resolve, reject) => {
      // FIXME: For some reason the map dies on Android after adding a marker
      // if (this.platform.is('android')) {
      // this.markerProvider.resetMap('mainmap', true);
      // }

      this.navCtrl
        .pop()
        .then(() => {
          // Switch to My Pets Tab
          // this.navCtrl.parent.select(1);
          this.app.getActiveNav().parent.select(1);

          resolve(true);
        })
        .catch(e => {
          console.error('backToMyPets: ' + JSON.stringify(e));
          reject(e);
        });
    });
  }

  scanQR(coowner = false) {
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

            // Adding a new pet
            if (coowner === false) {
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
            } else {
              // Adding a pet as a co-owner
              if (doc.exists) {
                if (!doc.exists) {
                  // someone already registered this tag, display an error
                  this.utilsProvider.displayAlert(
                    'Unable to use tag',
                    'Scanned tag is not attached to an existing pet'
                  );
                } else {
                  this.authProvider.getUserInfo().then(user => {
                    var tag_owners: Array<any> = doc.data().uid;

                    if (tag_owners.indexOf(user.uid) === -1) {
                      // TODO: Send notification to original owners with our UID
                      // Original owners can either decline or approve and add our UID to the tag UID array

                      // doc.data().fcm_token.forEach(t => {
                      //   this.notificationProvider.sendCoOwnerNotification(
                      //     'You have received a co-owner request',
                      //     `${user.displayName} wants to add ${
                      //       doc.data().name
                      //     }!`,
                      //     t.token,
                      //     user.uid,
                      //     doc.data().tagId
                      //   );
                      // });

                      this.utilsProvider.displayAlert(
                        'Request Sent',
                        'Please wait for the owners to confirm your request'
                      );
                    } else {
                      this.utilsProvider.displayAlert(
                        'Unable to add owners',
                        'Scanned tag is already associated with your account'
                      );
                    }

                    this.backToMyPets();
                  });
                }
              }
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

    if (
      this.tag.breed.some(
        b => this.tagProvider.getDogBreeds().indexOf(b) >= 0
      ) &&
      this.tag.breed.some(b => this.tagProvider.getCatBreeds().indexOf(b) >= 0)
    ) {
      this.utilsProvider.displayAlert(
        'Creating Cat/Dog hybrids is not supported at the moment.',
        "Let's hope it never is."
      );
      this.tagForm.get('breed').setErrors({ invalid: true });
    }

    /*        
    this.tag.breed.forEach(breed => {
      console.log('index: ' + index + 'indexOf: ' + this.breeds.indexOf(breed));

      let b: string = breed;

      
      if (index >= 0 && index <= 11 && this.breeds.indexOf(breed) > 11) {
        this.utilsProvider.displayAlert(
          'Creating Cat/Dog hybrids is not supported at the moment.',
          "Let's hope it never is."
        );
        this.tagForm.get('breed').setErrors({ invalid: true });
      }

      index = this.breeds.indexOf(breed);
    });
  */
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: 'Please Wait...',
        dismissOnPageChange: true,
        duration: 10
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
