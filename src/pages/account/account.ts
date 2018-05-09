import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  normalizeURL
} from 'ionic-angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthProvider, UserAccount } from '../../providers/auth/auth';
import { ImageProvider } from '../../providers/image/image';
import { UtilsProvider } from '../../providers/utils/utils';

@IonicPage()
@Component({
  selector: 'page-account',
  templateUrl: 'account.html'
})
export class AccountPage {
  private accountForm: FormGroup;

  private account: UserAccount;
  private photoChanged: boolean;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private authProvider: AuthProvider,
    public actionSheetCtrl: ActionSheetController,
    private pictureUtils: ImageProvider,
    private utilsProvider: UtilsProvider
  ) {
    this.accountForm = this.formBuilder.group({
      displayName: [
        '',
        [
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\/\\(\\)\\s*]+$')
        ]
      ],
      phoneNumber: [
        '',
        [
          Validators.minLength(10),
          Validators.maxLength(10),
          Validators.pattern('^[0-9]+$')
        ]
      ],
      address: [
        '',
        [
          Validators.minLength(1),
          Validators.pattern('^[a-zA-Z0-9\\/\\(\\)\\s*\\n\\r\\,]+$')
        ]
      ]
    });

    this.account = {
      displayName: '',
      phoneNumber: '',
      photoURL: '',
      address: ''
    };
  }

  saveAccountInfo() {
    this.authProvider
      .setUserInfo(this.account)
      .then(() => {
        this.utilsProvider.displayAlert('Profile Info Updated');
      })
      .catch(error => {
        console.error(error);
      });
  }

  save() {
    if (this.photoChanged) {
      this.utilsProvider.presentLoading(2000);

      this.pictureUtils
        .uploadPhoto()
        .then(data => {
          console.log(data.toString());
          this.account.photoURL = data.toString();

          this.saveAccountInfo();
        })
        .catch(error => {
          console.error('Unable to upload photo');
        });
    } else {
      this.saveAccountInfo();
    }
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
              this.account.photoURL = normalizeURL(photoUrl.toString());
              this.photoChanged = true;
            });
          }
        },
        {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.getPhoto(false).then(photoUrl => {
              this.account.photoURL = normalizeURL(photoUrl.toString());
              this.photoChanged = true;
            });
          }
        }
      ]
    });

    actionSheet.present();
  }

  ionViewWillLoad() {
    this.authProvider
      .getAccountInfo()
      .then(account => {
        console.log('Account info: ' + JSON.stringify(account));

        if (account !== undefined) {
          this.account = account;
        }
      })
      .catch(error => {
        console.error('Unable to get account info ' + error);
      });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AccountPage');
  }
}
