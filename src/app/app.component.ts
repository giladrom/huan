import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, AlertController, MenuController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';
import { AngularFireAuth } from 'angularfire2/auth';

import { BleProvider } from '../providers/ble/ble';
import { AuthProvider } from '../providers/auth/auth';
import { SettingsPage } from '../pages/settings/settings';
import { SettingsProvider } from '../providers/settings/settings';
import { TagListPage } from '../pages/tag-list/tag-list';
import { SplashScreen } from '@ionic-native/splash-screen';

@Component({
  templateUrl: 'app.html',
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
    private splashscreen: SplashScreen,
    private alertCtrl: AlertController,
    private menuCtrl: MenuController) {


    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashscreen.hide()

      this.settings.loadSettings();
      
      const unsubscribe = afAuth.auth.onAuthStateChanged(user => {
        if (!user) {
          this.rootPage = LoginPage;
          unsubscribe();
        } else {
          this.rootPage = HomePage;
          unsubscribe();
        }
      });

    });

    this.auth.getDisplayAvatar().then(avatar => {
      this.avatar = avatar;
    });

    this.auth.getDisplayName().then(name => {
      this.name = name;
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
              console.log("Logged Out!");

              this.menuCtrl.close();
              this.nav.setRoot(LoginPage);
            })
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

  showSettingsPage() {
    this.nav.push(SettingsPage);
  }

  showTagListPage() {
    this.nav.push(TagListPage);
  }


  ionViewDidLoad() {

  }
}

