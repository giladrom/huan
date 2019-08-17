import { Component, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  normalizeURL,
  LoadingController
} from 'ionic-angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthProvider, UserAccount } from '../../providers/auth/auth';
import { ImageProvider } from '../../providers/image/image';
import { UtilsProvider } from '../../providers/utils/utils';
import { StoreSubscription } from '../order-tag/order-tag';
import { SettingsProvider, Settings } from '../../providers/settings/settings';
import { LocationProvider } from '../../providers/location/location';
import { Geolocation } from '@ionic-native/geolocation';
import { AngularFirestore } from 'angularfire2/firestore';
import { map, retry, takeUntil, catchError } from 'rxjs/operators';
import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from 'rxjs';
import { Mixpanel } from '@ionic-native/mixpanel';

declare var Purchases: any;

@IonicPage()
@Component({
  selector: 'page-account',
  templateUrl: 'account.html'
})
export class AccountPage implements OnDestroy {
  private accountForm: FormGroup;

  private account: UserAccount;
  private subscription: StoreSubscription;
  private settings: Settings;
  private photoChanged: boolean;
  private teams$: Observable<any[]>;

  private subscriptionDescription: any;
  private win: any = window;

  private teamSelectOptions;
  private saved = false;
  private loader;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private authProvider: AuthProvider,
    public actionSheetCtrl: ActionSheetController,
    private pictureUtils: ImageProvider,
    private utilsProvider: UtilsProvider,
    private settingsProvider: SettingsProvider,
    private locationProvider: LocationProvider,
    private afs: AngularFirestore,
    private mixpanel: Mixpanel,
    private loadingCtrl: LoadingController
  ) {
    this.accountForm = this.formBuilder.group({
      displayName: [
        '',
        [
          Validators.minLength(2),
          Validators.maxLength(30),
          //Validators.pattern('^[a-zA-Z\\/\\(\\)\\s*]+$'),
          Validators.required
        ]
      ],
      phoneNumber: [
        '',
        [
          Validators.minLength(10),
          Validators.maxLength(20),
          Validators.pattern('^[0-9\\-\\+\\(\\)\\s]+$')
        ]
      ],
      address: [
        '',
        [
          Validators.minLength(5)
          //Validators.pattern('^[a-zA-Z0-9\\/\\(\\)\\s*\\n\\r\\,\\.\\-]+$')
          // Validators.required
        ]
      ],
      team: ['', [Validators.minLength(3), Validators.maxLength(50)]]
    });

    this.account = {
      displayName: '',
      phoneNumber: '',
      photoURL: normalizeURL('assets/imgs/anonymous2.png'),
      address: '',
      team: ''
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
      monitoringFrequency: 5,
      showWelcome: true,
      shareContactInfo: true,
      highAccuracyMode: false,
      sensor: false
    };

    this.teamSelectOptions = {
      title: 'Choose Your Team'
    };

    this.loadInfo();
  }

  blur() {
    console.log('blur');
    this.saved = true;

    setTimeout(() => {
      this.saved = false;
    }, 1000);
  }

  saveAccountInfo() {
    return new Promise((resolve, reject) => {
      this.authProvider
        .setUserInfo(this.account)
        .then(() => {
          console.log('Account info saved: ', JSON.stringify(this.account));

          resolve(true);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  save() {
    return new Promise((resolve, reject) => {
      if (this.photoChanged) {
        this.utilsProvider.presentLoading(2000);

        this.pictureUtils
          .uploadPhoto()
          .then(data => {
            console.log(data.toString());
            this.account.photoURL = data.toString();

            this.saveAccountInfo()
              .then(() => {
                resolve(true);
              })
              .catch(e => {
                reject(e);
              });
          })
          .catch(error => {
            console.error('Unable to upload photo');
          });
      } else {
        this.saveAccountInfo()
          .then(() => {
            resolve(true);
          })
          .catch(e => {
            reject(e);
          });
      }
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

  changeTeam() {
    this.mixpanel
      .track('change_team', { team: this.account.team })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });
  }

  getSubscriptionTitle(subscription) {
    var ret;

    switch (subscription) {
      case 'com.gethuan.huanapp.basic_protection':
        ret = 'Basic';
        break;
      case 'com.gethuan.huanapp.community_protection_15_mile_monthly':
        ret = 'Premium';
        break;
      case 'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99':
        ret = 'Premium';
        break;

      case 'com.gethuan.huanapp.community_protection_unlimited_monthly':
        ret = 'Unlimited';
        break;
    }

    return ret;
  }

  restorePurchase() {
    this.showLoading();

    this.mixpanel
      .track('restore_purchases')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    Purchases.restoreTransactions(
      info => {
        this.dismissLoading();

        console.log('RevenueCat Restored Purchase: ', JSON.stringify(info));

        if (info.activeEntitlements && info.activeEntitlements.length > 0) {
          this.mixpanel
            .track('restore_purchases_success')
            .then(() => {})
            .catch(e => {
              console.error('Mixpanel Error', e);
            });

          this.utilsProvider.displayAlert(
            'Restore Purchases',
            'Successfully Restored Purchases'
          );
        } else {
          this.utilsProvider.displayAlert(
            'Restore Purchases',
            'No Previous Purchases Found'
          );
        }
      },
      error => {
        this.dismissLoading();

        this.utilsProvider.displayAlert(
          'Restore Purchases',
          'Error Restoring Purchases. Please contact support.'
        );

        this.mixpanel
          .track('restore_purchases_error', { error: error })
          .then(() => {})
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        console.error('RevenueCat Error ' + JSON.stringify(error));
      }
    );
  }

  loadInfo() {
    this.authProvider
      .getAccountInfo()
      .then(account => {
        console.log('Account info: ' + JSON.stringify(account));

        if (account !== undefined) {
          this.account = account;
        }

        if (!account.phoneNumber) {
          account.phoneNumber = '';
        }

        if (!account.address) {
          account.address = '';
        }
      })
      .catch(error => {
        console.error('Unable to get account info ' + error);
      });

    Purchases.getPurchaserInfo(
      info => {
        console.log('getPurchaserInfo', JSON.stringify(info));

        try {
          const subscribed =
            info.activeSubscriptions !== 'undefined' &&
            info.activeEntitlements.length > 0;
          if (!subscribed) {
            this.subscriptionDescription = 'No Subscription';
          } else {
            this.subscriptionDescription = this.getSubscriptionTitle(
              info.activeSubscriptions[0]
            );
          }
        } catch (e) {
          console.error(JSON.stringify(e));
        }
      },
      error => {
        // Error fetching purchaser info
        console.error(JSON.stringify(error));
      }
    );

    this.settingsProvider.getSettings().subscribe(settings => {
      if (settings) {
        this.settings = settings;
      }
    });
  }

  ionViewDidEnter() {
    this.teams$ = this.afs
      .collection('Rescues')
      .snapshotChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data({
              serverTimestamps: 'previous'
            });
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .takeUntil(this.destroyed$);
  }

  ionViewDidLeave() {
    this.save()
      .then(() => {
        console.log('ionViewDidLeave: Account Info saved');
      })
      .catch(e => {
        console.error('ionViewDidLeave: Unable to save account info');
      });
  }

  getCurrentAddress() {
    this.showLoading();

    console.log('getCurrentAddress()');

    this.locationProvider
      .getLocationName()
      .then(location => {
        this.dismissLoading();

        console.log('Current Location', JSON.stringify(location));

        this.account.address = `${location[0].subThoroughfare} ${
          location[0].thoroughfare
        } ${location[0].locality} ${location[0].administrativeArea}`;
      })
      .catch(e => {
        this.dismissLoading();

        this.utilsProvider.displayAlert(
          'Location Error',
          'Unable to retrieve current location.'
        );
        console.error(e);
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

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
