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
import { InAppPurchase } from '@ionic-native/in-app-purchase';
import { StoreSubscription } from '../order-tag/order-tag';
import { SettingsProvider, Settings } from '../../providers/settings/settings';

@IonicPage()
@Component({
  selector: 'page-account',
  templateUrl: 'account.html'
})
export class AccountPage {
  private accountForm: FormGroup;

  private account: UserAccount;
  private subscription: StoreSubscription;
  private settings: Settings;
  private photoChanged: boolean;

  private subscriptionDescription: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private authProvider: AuthProvider,
    public actionSheetCtrl: ActionSheetController,
    private pictureUtils: ImageProvider,
    private utilsProvider: UtilsProvider,
    private iap: InAppPurchase,
    private settingsProvider: SettingsProvider
  ) {
    this.accountForm = this.formBuilder.group({
      displayName: [
        '',
        [
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\/\\(\\)\\s*]+$'),
          Validators.required
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
          Validators.minLength(5),
          Validators.pattern('^[a-zA-Z0-9\\/\\(\\)\\s*\\n\\r\\,\\.\\-]+$'),
          Validators.required
        ]
      ]
    });

    this.account = {
      displayName: '',
      phoneNumber: '',
      photoURL: normalizeURL('assets/imgs/anonymous2.png'),
      address: ''
    };

    this.subscription = {
      name: '',
      email: '',
      address1: '',
      address2: '',
      city: '',
      state: '--',
      zipcode: '',
      amount: 1,
      subscription_type: '',
      start_date: ''
    };

    this.settings = {
      regionNotifications: false,
      communityNotifications: true,
      communityNotificationString: '',
      tagNotifications: false,
      enableMonitoring: true,
      showWelcome: true,
      shareContactInfo: true
    };

    this.loadInfo();
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

  restorePurchase() {
    this.iap
      .restorePurchases()
      .then(data => {
        console.log('Restored Purchases: ' + JSON.stringify(data));
      })
      .catch(error => {
        console.error('Unable to restore purchases: ' + error);
      });
  }

  loadInfo() {
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

    this.authProvider
      .getSubscriptionInfo()
      .then(subscription => {
        console.log('Subscription info: ' + JSON.stringify(subscription));

        if (subscription !== undefined) {
          this.subscription = subscription;

          switch (this.subscription.subscription_type) {
            case 'com.gethuan.huanapp.monthly_subscription':
              this.subscriptionDescription = 'Monthly Subscription';
              break;
            case 'com.gethuan.huanapp.yearly_subscription':
              this.subscriptionDescription = 'Yeary Subscription';
              break;
          }
        } else {
          this.subscription.subscription_type = 'No Subscription';
        }
      })
      .catch(error => {
        console.error('Unable to get subscription info ' + error);
      });

    this.settingsProvider.getSettings().subscribe(settings => {
      if (settings) {
        this.settings = settings;
      }
    });
  }
}
