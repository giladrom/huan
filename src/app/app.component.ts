import { Component, ViewChild, OnDestroy } from '@angular/core';
import {
  Nav,
  Platform,
  AlertController,
  MenuController,
  App,
  NavController,
  normalizeURL
} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { AngularFireAuth } from 'angularfire2/auth';

import { BleProvider } from '../providers/ble/ble';
import { AuthProvider } from '../providers/auth/auth';

import { InitProvider } from '../providers/init/init';
import { Subscription, Subject } from 'rxjs';
import { UtilsProvider } from '../providers/utils/utils';

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

  notifications: any = 0;

  devel: any;

  constructor(
    platform: Platform,
    private statusBar: StatusBar,
    ble: BleProvider,
    private afAuth: AngularFireAuth,
    private auth: AuthProvider,
    private alertCtrl: AlertController,
    private menuCtrl: MenuController,
    private app: App,
    private init: InitProvider,
    private utilsProvider: UtilsProvider
  ) {
    // imageLoaderConfig.enableDebugMode();
    // imageLoaderConfig.enableSpinner(false);
    // imageLoaderConfig.setImageReturnType('base64');

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

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
          this.init.initializeApp();

          if (!user.isAnonymous) {
            console.log('User logged in - Initializing...');

            let sub = new Subject();

            this.auth
              .getAccountInfo(true)
              .then(account => {
                account.takeUntil(sub).subscribe(account => {
                  if (account !== undefined) {
                    // sub.next();
                    // sub.complete();

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

                    if (account.phoneNumber.length === 0) {
                      this.notifications++;
                    }

                    if (account.address.length === 0) {
                      this.notifications++;
                    }
                  }
                });
              })
              .catch(error => {
                this.avatar = normalizeURL('assets/imgs/anonymous2.png');
                console.error(error);
              });

            // this.rootPage = 'HomePage';
            this.rootPage = 'TabsPage';
          } else {
            console.log('Anonymous Log in...');
            this.rootPage = 'FoundPetPage';
          }

          //unsubscribe();
        }
      });

      this.authSubscription.add(subscribe);
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
            // this.init.shutdownApp();

            this.auth.logoutUser().then(() => {
              console.log('Logged Out!');

              this.menuCtrl.close();
              //this.nav.setRoot('LoginPage');
            });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
  }

  sendInvite() {
    this.utilsProvider.textReferralCode();
    this.auth.updateInviteCount(+this.invites);
  }

  showHomePage() {
    this.nav.popToRoot();
  }

  showAccountPage() {
    this.nav.push('AccountPage');
  }

  showSettingsPage() {
    this.nav.push('SettingsPage');
  }

  showTagListPage() {
    this.nav.push('TagListPage');
  }

  showSubscriptionPage() {}

  showSupportPage() {
    this.nav.push('SupportPage');
  }

  ionViewDidLoad() {}

  menuOpen() {
    console.log('menuOpen');
    // this.notifications = 0;
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }
}
