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
    private nativeStorage: NativeStorage
  ) {
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
                      account.phoneNumber &&
                      account.phoneNumber.length === 0
                    ) {
                      this.notifications++;
                    }

                    if (account.address && account.address.length === 0) {
                      this.notifications++;
                    }
                  }
                });
              })
              .catch(error => {
                this.avatar = normalizeURL(
                  'assets/imgs/anonymous2.png'
                );
                console.error(error);
              });

            this.rootPage = 'TabsPage';
          } else {
            console.log('Anonymous Log in...');
            this.rootPage = 'FoundPetPage';
          }
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
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }
}
