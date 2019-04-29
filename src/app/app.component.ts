import { Component, ViewChild, OnDestroy } from '@angular/core';
import {
  Nav,
  Platform,
  AlertController,
  MenuController,
  NavController,
  normalizeURL
} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { AngularFireAuth } from 'angularfire2/auth';

import { AuthProvider } from '../providers/auth/auth';

import { InitProvider } from '../providers/init/init';
import { Subscription, Subject } from 'rxjs';
import { UtilsProvider } from '../providers/utils/utils';
import { NativeStorage } from '@ionic-native/native-storage';
import { Mixpanel } from '@ionic-native/mixpanel';
import { ENV } from '@app/env'
import { NotificationProvider } from '../providers/notification/notification';

@Component({
  templateUrl: 'app.html'
})
export class MyApp implements OnDestroy {
  rootPage: any;
  authSubscription: Subscription = new Subscription();

  @ViewChild(Nav)
  nav: NavController;

  avatar: String;
  name: String;
  email: String;
  version: String;
  invites: String;
  score: any;

  notifications: any = 0;

  devel: any;
  private win: any = window;

  constructor(
    platform: Platform,
    private statusBar: StatusBar,
    private afAuth: AngularFireAuth,
    private auth: AuthProvider,
    private alertCtrl: AlertController,
    private menuCtrl: MenuController,
    private init: InitProvider,
    private utilsProvider: UtilsProvider,
    private nativeStorage: NativeStorage,
    private mixpanel: Mixpanel,
    private notificationProvider: NotificationProvider,
    
  ) {
    platform.ready().then(() => {
     

      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      if (ENV.mode === "Development") {
        this.devel = true
      }

      // Register Android back button
      platform.registerBackButtonAction(() => {
        let view = this.nav.getActive();

        if (view.getNav().canGoBack()) {
          view.getNav().pop();
        } else {
          // platform.exitApp();
        }
      });

      if (platform.is('android')) {
        this.statusBar.overlaysWebView(false);
        this.statusBar.backgroundColorByHexString('#202020');
      }

      const subscribe = this.afAuth.auth.onAuthStateChanged(user => {
        if (!user) {
          this.rootPage = 'LoginPage';

          this.init.shutdownApp();

          //unsubscribe();
        } else {

          if (!user.isAnonymous) {
            console.log('User logged in - Initializing...');

            // Store UID for Android background scanning
            if (platform.is('android')) {
              this.nativeStorage
                .setItem('uid', user.uid)
                .then(() => {
                  console.log('Stored UID in persistent storage');
                })
                .catch(e => {
                  console.error('Unable to store UID: ' + e);
                });
            }

         

            if (this.auth.isNewUser() && platform.is('ios')) {
              this.rootPage = 'PermissionsPage';
            } else {
              this.init.initializeApp();

              this.loadMenuDisplayItems(user);
              this.rootPage = 'TabsPage';
            }
          } else {
            console.log('Anonymous Log in...');
            this.rootPage = 'FoundPetPage';
          }
        }
      });

      this.authSubscription.add(subscribe);
    });
  }

  loadMenuDisplayItems(user) {
    let sub = new Subject();

    this.auth
      .getAccountInfo(true)
      .then(account => {
        account.takeUntil(sub).subscribe(account => {                  
          if (account !== undefined) {
            this.avatar = account.photoURL;
            this.name = account.displayName;
            this.invites = account.invites;
            this.email = user.email;

            this.utilsProvider
              .getVersion()
              .then(version => {
                this.version = version;
              })
              .catch(e => {
                console.error(e);
              });

            this.notifications = 0;

            if (
              account.phoneNumber.length === 0
            ) {
              this.notifications++;
            }

            if (
              account.address.length === 0) {
              this.notifications++;
            }
          }

          this.utilsProvider
          .getCurrentScore('referral')
          .then(s => {
            this.score = s;
          });
        });


      })
      .catch(error => {
        this.avatar = normalizeURL(
          'assets/imgs/anonymous2.png'
        );
        console.error(error);
      });
  }

  sendInvite() {
    this.mixpanel
      .track('earn_credits_clicked')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    let alertBox = this.alertCtrl.create({
      title: 'Huan Credits',
      message: "Refer Friends, Earn credits and get Free Stuff!",
      buttons: [
        {
          text: 'Maybe Later',
          role: 'cancel',
          handler: () => { }
        },

        {
          text: 'Earn Credits!',
          handler: () => {
            this.notificationProvider.updateTokens();

            this.auth
              .getAccountInfo(false)
              .then(account => {
                this.utilsProvider
                  .textReferralCode(
                    account.displayName,
                    account.team ? account.team : '',
                    this.notificationProvider.getFCMToken()
                  )
                  .then(r => {
                    console.log('sendInvite', r);

                    this.mixpanel
                      .track('earn_credits_invite_sent')
                      .then(() => { })
                      .catch(e => {
                        console.error('Mixpanel Error', e);
                      });
                  })
                  .catch(e => {
                    console.warn('textReferralCode', e);
                  });
              })
              .catch(e => {
                console.error('sendInvite(): ERROR: Unable to get account info!', e);
              });
          }
        },

      ],
      cssClass: 'alertclass'
    });

    alertBox
      .present()
      .then(() => {

      })
      .catch(e => {
        console.error('sendInvite: ' + JSON.stringify(e));
      });

  }


  logOut() {
    let confirm = this.alertCtrl.create({
      title: 'Log Out',
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
            this.mixpanel.track('logout').then(() => {}).catch(e => {
              console.error('Mixpanel Error', e);
            });
            this.auth.logoutUser().then(() => {
              
              console.log('Logged Out!');

              this.menuCtrl.close();
            });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
  }

  showHomePage() {
    this.mixpanel.track('show_home_page').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.nav.popToRoot();
  }

  showShop() {
    this.mixpanel.track('show_shop').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    window.open(
      'https://gethuan.com/shop/',
      '_system'
    );

  }

  showAccountPage() {
    this.mixpanel.track('show_account_page').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.nav.push('AccountPage');
  }

  showSettingsPage() {
    this.mixpanel.track('show_settings_page').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.nav.push('SettingsPage');
  }

  showTagListPage() {
    this.nav.push('TagListPage');
  }

  showDevelPage() {
    this.nav.push('ProgramTagsPage');
  }

  showSubscriptionPage() {}

  showSupportPage() {
    this.mixpanel.track('show_support_page').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.nav.push('SupportPage');
  }

  ionViewDidLoad() {}

  menuOpen() {
    console.log('menuOpen');
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }
}
