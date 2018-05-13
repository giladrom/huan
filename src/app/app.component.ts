import { Component, ViewChild } from '@angular/core';
import {
  Nav,
  Platform,
  AlertController,
  MenuController,
  App,
  normalizeURL
} from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { AngularFireAuth } from 'angularfire2/auth';

import { BleProvider } from '../providers/ble/ble';
import { AuthProvider, UserAccount } from '../providers/auth/auth';
import { SettingsProvider } from '../providers/settings/settings';

import { HockeyApp } from 'ionic-hockeyapp';
import { InitProvider } from '../providers/init/init';
import { FoundPetPage } from '../pages/found-pet/found-pet';
import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';
import { TagListPage } from '../pages/tag-list/tag-list';
import { SettingsPage } from '../pages/settings/settings';
import { AccountPage } from '../pages/account/account';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage: any;

  @ViewChild(Nav) nav: Nav;

  avatar: String;
  name: String;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    ble: BleProvider,
    private afAuth: AngularFireAuth,
    private auth: AuthProvider,
    private settings: SettingsProvider,
    private alertCtrl: AlertController,
    private menuCtrl: MenuController,
    private app: App,
    private hockeyapp: HockeyApp,
    private init: InitProvider
  ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      // The Android ID of the app as provided by the HockeyApp portal. Can be null if for iOS only.
      let androidAppId = '2fdddd2639634ea28e4be2e8b9de0a8a';
      // The iOS ID of the app as provided by the HockeyApp portal. Can be null if for android only.
      let iosAppId = 'd0ba634806634070a0e912961d5c564a';
      // Specifies whether you would like crash reports to be automatically sent to the HockeyApp server when the end user restarts the app.
      let autoSendCrashReports = false;
      // Specifies whether you would like to display the standard dialog when the app is about to crash. This parameter is only relevant on Android.
      let ignoreCrashDialog = true;

      this.hockeyapp
        .start(androidAppId, iosAppId, autoSendCrashReports, ignoreCrashDialog)
        .then(data => {
          console.info('HockeyApp started: ' + JSON.stringify(data));
        })
        .catch(error => {
          console.error('HockeyApp error:' + JSON.stringify(error));
        });

      //So app doesn't close when hockey app activities close
      //This also has a side effect of unable to close the app when on the rootPage and using the back button.
      //Back button will perform as normal on other pages and pop to the previous page.
      platform.registerBackButtonAction(() => {
        let nav = this.app.getRootNav();
        if (nav.canGoBack()) {
          nav.pop();
        } else {
          nav.setRoot(this.rootPage);
        }
      });

      statusBar.styleDefault();

      const unsubscribe = this.afAuth.auth.onAuthStateChanged(user => {
        if (!user) {
          this.rootPage = LoginPage;
          this.settings.cleanup();
          this.init.shutdownApp();
          //unsubscribe();
        } else {
          this.init.initializeApp();

          if (!user.isAnonymous) {
            console.log('User logged in - Initializing...');

            this.auth
              .getAccountInfo(true)
              .then(account => {
                account.subscribe(account => {
                  this.avatar = account.photoURL;
                  this.name = account.displayName;
                });
              })
              .catch(error => {
                this.avatar = normalizeURL('assets/imgs/anonymous2.png');
                console.error(error);
              });

            this.rootPage = HomePage;

            // this.auth.getDisplayAvatar().then(avatar => {
            //   this.avatar = avatar;
            // });

            // this.auth.getDisplayName().then(name => {
            //   this.name = name;
            // });
          } else {
            console.log('Anonymous Log in...');
            this.rootPage = FoundPetPage;
          }

          //unsubscribe();
        }
      });
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
            this.init.shutdownApp();

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

  showHomePage() {
    this.nav.popToRoot();
  }

  showAccountPage() {
    this.nav.push(AccountPage);
  }

  showSettingsPage() {
    this.nav.push(SettingsPage);
  }

  showTagListPage() {
    this.nav.push(TagListPage);
  }

  showSubscriptionPage() {}

  showSupportPage() {}

  ionViewDidLoad() {}
}
