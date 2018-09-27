import { Component, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  AlertController,
  normalizeURL
} from 'ionic-angular';
import { Tag, TagProvider } from '../../providers/tag/tag';
import { AngularFirestore } from 'angularfire2/firestore';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ImageProvider } from '../../providers/image/image';
import { MarkerProvider } from '../../providers/marker/marker';
import { QrProvider } from '../../providers/qr/qr';
import { UtilsProvider } from '../../providers/utils/utils';
import { GoogleMapsEvent } from '@ionic-native/google-maps';
import { ReplaySubject } from 'rxjs';
import { AuthProvider } from '../../providers/auth/auth';
import firebase from 'firebase';
import { WebView } from '@ionic-native/ionic-webview';

@IonicPage()
@Component({
  selector: 'page-edit',
  templateUrl: 'edit.html'
})
export class EditPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private tagForm: FormGroup;

  private tag: Tag;
  private photoChanged: boolean;

  breedSelectOptions: any;
  furSelectOptions: any;
  genderSelectOptions: any;
  sizeSelectOptions: any;
  characterSelectOptions: any;
  breeds: Array<any>;
  colors: Array<any>;
  characters: Array<any>;
  owners: Array<any>;
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
    private utils: UtilsProvider,
    private tagProvider: TagProvider,
    private authProvider: AuthProvider
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          Validators.pattern('^[a-zA-Z0-9\\.\\s*]+$')
        ]
      ],
      breed: [
        '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.pattern('^[a-zA-Z\\/\\(\\)\\,*\\s*]+$')
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
          Validators.minLength(1),
          Validators.maxLength(30)
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
          Validators.maxLength(300),
          Validators.pattern('^[a-zA-Z0-9\\.\\,\\-\\!\\(\\)\\[\\]\\"\\"\\s*]+$')
        ]
      ]
      //remarks: ['']
    });

    this.breedSelectOptions = {
      title: 'Breed',
      subTitle: 'Select more than one for a mixed breed'
    };

    this.furSelectOptions = {
      title: 'Fur color'
      // subTitle: 'Select more than one for a mixed breed'
    };

    this.genderSelectOptions = {
      title: 'Gender'
    };

    this.sizeSelectOptions = {
      title: 'Size'
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
      breed: this.breeds[0],
      color: this.colors[0],
      gender: 'Male',
      remarks: 'None',
      weight: '50',
      size: 'Large',
      tagId: '',
      location: '',
      character: 'Friendly',
      img: ' ',
      lastseen: firebase.firestore.FieldValue.serverTimestamp(),
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
      tagattached: true
    };

    this.photoChanged = false;
  }

  ionViewWillLoad() {
    console.log('ionViewDidLoad EditPage');
    const sub = this.afs
      .collection<Tag>('Tags')
      .doc(this.navParams.data)
      .valueChanges()
      .takeUntil(this.destroyed$)
      .subscribe(tag => {
        sub.unsubscribe();

        this.owners = new Array();

        this.tag = <Tag>tag;

        this.tag.uid.forEach(t => {
          const unsub = this.afs
            .collection('Users')
            .doc(t)
            .ref.onSnapshot(data => {
              unsub();

              if (data.exists) {
                this.owners.push({
                  uid: t,
                  owner: data.data().account.displayName
                });
              }
            });
        });
      });
  }

  showRemoveOwnerConfirmDialog(owner, uid) {
    this.authProvider.getUserId().then(_uid => {
      // Display a different warning and pop back to the list page
      // if removing ourselves as an owner

      if (uid === _uid) {
        let alert = this.alertCtrl.create({
          title: `Warning`,
          message: `You are about to remove yourself as an owner. Are you sure?`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                console.log('Cancel clicked');
              }
            },
            {
              text: 'Remove',
              handler: () => {
                console.log('Remove clicked');

                this.removeOwner(uid);
                this.navCtrl.pop();
              }
            }
          ]
        });

        alert.present();
      } else {
        let alert = this.alertCtrl.create({
          title: `Remove owner`,
          message: `This will remove ${owner} as an owner. Are you sure?`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => {
                console.log('Cancel clicked');
              }
            },
            {
              text: 'Remove',
              handler: () => {
                console.log('Remove clicked');

                this.removeOwner(uid);
              }
            }
          ]
        });

        alert.present();
      }
    });
  }

  removeOwner(owner) {
    var item_to_delete = this.tag.uid.indexOf(owner);
    console.log(`Item to delete: ${item_to_delete}`);

    if (item_to_delete >= 0) {
      this.tag.uid.splice(item_to_delete, 1);

      var fcm_item_to_delete = this.tag.fcm_token.indexOf(
        this.tag.fcm_token.find(ownersObj => ownersObj.uid === owner)
      );

      if (fcm_item_to_delete >= 0) {
        this.tag.fcm_token.splice(fcm_item_to_delete, 1);
      }

      this.writeTagData();
    }
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

  getOwnersName(owner) {
    var unsubscribe = this.afs
      .collection('Users')
      .doc(owner)
      .ref.onSnapshot(doc => {
        unsubscribe();

        return doc.data().account.displayName;
      });
  }

  save() {
    if (this.photoChanged === true) {
      this.pictureUtils
        .uploadPhoto()
        .then(data => {
          this.tag.img = data.toString();

          // Delete existing marker
          console.log('Deleting previous marker');

          this.markerProvider.deleteMarker(this.tag.tagId);

          // Add new marker
          this.markerProvider
            .addMarker(this.tag)
            .then(marker => {
              console.log('Successfully added new marker');

              marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
                this.utils.getDirections(this.tag.name, this.tag.location);
              });
            })
            .catch(error => {
              console.error('addMarker() error: ' + error);
            });

          this.writeTagData();
        })
        .catch(e => {
          console.error('Could not upoad photo: ' + JSON.stringify(e));
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
    this.qrProvider
      .scan()
      .then(() => {
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
              this.utils.displayAlert(
                'Tag changed successfully',
                'Save changes to update tag settings'
              );

              this.original_tagId = this.tag.tagId;

              this.tag.tagId = minor;
            }

            unsubscribe();
          });
      })
      .catch(e => {
        console.error('Unable to scan QR code: ' + JSON.stringify(e));
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
            this.pictureUtils
              .getPhoto(true)
              .then(photo => {
                window.document
                  .getElementById('#image')
                  .setAttribute('src', photo.toString());

                // this.tag.img = <string>photo;
                this.photoChanged = true;
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
                window.document
                  .getElementById('#image')
                  .setAttribute('src', photo.toString());

                // this.tag.img = <string>photo;
                this.photoChanged = true;
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

  onBreedChange() {
    console.log('Breed Changed: ' + JSON.stringify(this.tag.breed));

    let index = -1;

    if (
      this.tag.breed.some(
        b => this.tagProvider.getDogBreeds().indexOf(b) >= 0
      ) &&
      this.tag.breed.some(b => this.tagProvider.getCatBreeds().indexOf(b) >= 0)
    ) {
      this.utils.displayAlert(
        'Creating Cat/Dog hybrids is not supported at the moment.',
        "Let's hope it never is."
      );
      this.tagForm.get('breed').setErrors({ invalid: true });
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
