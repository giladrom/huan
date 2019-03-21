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
import { Mixpanel } from '@ionic-native/mixpanel';
import { first } from 'rxjs/internal/operators/first';
import { map } from 'rxjs/internal/operators/map';
import { BleProvider } from '../../providers/ble/ble';

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
  private imgBlob: any;
  private randomTagId: any;
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
    private imageProvider: ImageProvider,
    private locationProvider: LocationProvider,
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
    private markerProvider: MarkerProvider,
    private mixpanel: Mixpanel,
    private ble: BleProvider
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
      /*
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
        ]
      ]
      */
    });

    this.imageChanged = false;

    this.locationProvider
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
      name: 'New Pet',
      breed: this.breeds[105],
      color: this.colors[1],
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '0',
      location: '',
      character: 'Friendly',
      lastseen: firebase.firestore.FieldValue.serverTimestamp(),
      img: 'https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/App_Assets%2Fdog.jpeg?alt=media&token=2f6c3390-ac63-4df4-b27d-bbb8ca9cac60',
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

    this.imageProvider.setPhoto(this.tag.img);
    this.getLocalImage(this.tag.img).then(blob => {
      this.imgBlob = blob;
    }).catch(e => {
      console.error(e);
    });

    this.findRandomTagId().then(tagId => {
      this.randomTagId = tagId;
    }).catch(e => {
      console.error(e);
    })
  }

  breedChange(event: { component: SelectSearchableComponent; value: any }) {
    console.log('breed: ', event.value);
  }

  gotoAddPictureSlide() {
    this.mixpanel
      .track('goto_add_picture_slide')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slideTo(1, 500);
    this.slides.lockSwipes(true);
  }

  gotoAddTagSlide() {
    this.mixpanel
      .track('goto_add_tag_slide')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slideTo(2, 500);
    this.slides.lockSwipes(true);
  }

  gotoInfoSlide() {
    this.mixpanel
      .track('goto_info_slide')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slideTo(3, 500);
    this.slides.lockSwipes(true);
  }

  gotoRemarksSlide() {
    this.mixpanel
      .track('goto_remarks_slide')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slideTo(4, 500);
    this.slides.lockSwipes(true);
  }

  goForward() {
    this.mixpanel
      .track('go_forward')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.keyboard.hide();
    this.slides.lockSwipes(false);
    this.slides.slideNext(500);
    this.slides.lockSwipes(true);
  }

  goBack() {
    this.mixpanel
      .track('go_back')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slidePrev(500);
    this.slides.lockSwipes(true);
  }

  gotoOrderPage() {
    this.navCtrl.push('OrderTagPage');
  }

  ionViewDidLoad() {
    this.mixpanel
      .track('add_pet_page')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    console.log('ionViewDidLoad AddPage');
    // this.slides.lockSwipes(true);
  }

  ionViewDidEnter() {
    this.ble.disableMonitoring();
  }

  ionViewDidLeave() {
    this.ble.enableMonitoring();
  }

  changePicture() {
    this.mixpanel
      .track('change_picture')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      buttons: [
        {
          text: 'Take a picture',
          icon: 'camera',
          handler: () => {
            this.mixpanel
              .track('change_picture_camera')
              .then(() => { })
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            this.imageProvider
              .getPhoto(true)
              .then(photo => {
                // console.log(photo);
                // window.document
                //   .getElementById('#image')
                //   .setAttribute('src', photo.toString());

                window.document
                .getElementById('#image')
                .style.backgroundImage = `url(${photo})`;

                this.tag.img = normalizeURL(photo.toString());

                this.getLocalImage(this.tag.img).then(blob => {
                  this.imgBlob = blob;

                  this.imageProvider
                    .uploadPhoto(this.imgBlob)
                    .then(data => {
                      console.log('image url: ' + data.toString());
                      this.tag.img = data.toString();
                    }).catch(e => {
                      console.error(e);
                    });
                }).catch(e => {
                  console.error(e);
                });

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
            this.mixpanel
              .track('change_picture_gallery')
              .then(() => { })
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            this.imageProvider
              .getPhoto(false)
              .then(photo => {
                // console.log(photo);
                // window.document
                //   .getElementById('#image')
                //   .setAttribute('src', photo.toString());

                  window.document
                  .getElementById('#image')
                  .style.backgroundImage = `url(${photo})`;
  
                this.tag.img = normalizeURL(photo.toString());

                this.getLocalImage(this.tag.img).then(blob => {
                  this.imgBlob = blob;

                  this.imageProvider
                    .uploadPhoto(this.imgBlob)
                    .then(data => {
                      console.log('image url: ' + data.toString());
                      this.tag.img = data.toString();
                    }).catch(e => {
                      console.error(e);
                    });

                }).catch(e => {
                  console.error(e);
                })

                this.imageChanged = true;
              })
              .catch(e => {
                console.error('Could not get photo: ' + JSON.stringify(e));
              });
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

    actionSheet.present();
  }

  findRandomTagId(): Promise<any> {
    return new Promise((resolve, reject) => {
      let tagId = this.utilsProvider.randomIntFromInterval(9000, 9999);

      console.log(`Checking if temporary ID ${tagId} is taken...`);

      var unsubscribe = this.afs
        .collection<Tag>('Tags')
        .doc(tagId.toString())
        .snapshotChanges()
        .pipe(
          map(a => {
            const data = a.payload.data({
              serverTimestamps: 'previous'
            }) as Tag;
            const id = a.payload.id;
            return { id, ...data };
          }),
          first()
        )
        .subscribe(
          tag => {
            unsubscribe.unsubscribe()
            if (tag.tagId) {
              console.log(`${tagId} is taken. trying again...`);
              resolve(this.findRandomTagId());
            } else {
              console.log(`${tagId} is available. Proceeding...`);

              resolve(tagId);
            }
          });
    });
  }

  getLocalImage(img): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log("getLocalImage: requesting");
      var sub = this.http
        .get(img, {
          observe: 'response',
          responseType: 'blob'
        })
        .subscribe(
          data => {
            sub.unsubscribe();

            console.log("getLocalImage: got image data");
            resolve(data.body);
          },
          error => {
            console.error('this.http.get: ' + JSON.stringify(error));
            reject(error);
          }
        );
    });
  }

  save() {
    this.showLoading();

    this.saveNewTag().then(() => {
      this.backToMyPets().then(() => {
      }).catch(e => {
        console.error(e);
      })
    }).catch(e => {
      console.error(e);
    })
  }

  saveNewTag() {
    return new Promise((resolve, reject) => {
      this.tag.tagId = this.randomTagId.toString();

      console.log("save: Adding tag...");
      this.afs
        .collection<Tag>('Tags')
        .doc(this.randomTagId.toString())
        .set(this.tag)
        .then(() => {
          console.log('Successfully added tag', this.randomTagId);

          this.mixpanel
            .track('add_new_tag', { tag: this.randomTagId })
            .then(() => { })
            .catch(e => {
              console.error('Mixpanel Error', e);
            });

          this.markerProvider.addPetMarker(this.tag, true).then(() => {
            resolve(true);
          }).catch(e => {
            resolve(true);
            console.error(e);
          })
        })
        .catch(e => {
          console.error('Unable to add tag: ' + JSON.stringify(e));
          reject(e);
        });
    });
  }

  backToMyPets(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.navCtrl
        .pop()
        .then(() => {
          // Switch to My Pets Tab
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
    this.mixpanel
      .track('scan_qr')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    var loader = this.utilsProvider.presentLoading(30000);

    this.qrscan
      .scan()
      .then(() => {
        var minor = this.qrscan.getScannedTagId().minor;

        this.mixpanel
          .track('scan_qr_success', { tag: minor })
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });
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
                this.mixpanel
                  .track('tag_already_in_use', { tag: minor })
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                // someone already registered this tag, display an error
                this.utilsProvider.displayAlert(
                  'Unable to use tag',
                  'Scanned tag is already in use'
                );
              } else {
                this.mixpanel
                  .track('tag_attached', { tag: minor })
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

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
    this.mixpanel
      .track('on_breed_change')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

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
