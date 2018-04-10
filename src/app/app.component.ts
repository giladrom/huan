import { Component, ViewChild } from '@angular/core';
import { Nav, Platform } from 'ionic-angular';
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

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    ble: BleProvider,
    private afAuth: AngularFireAuth,
    private auth: AuthProvider,
    private settings: SettingsProvider,
    private splashscreen: SplashScreen) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashscreen.hide()
    });

    const unsubscribe = afAuth.auth.onAuthStateChanged(user => {
      if (!user) {
        this.rootPage = LoginPage;
        unsubscribe();
      } else {
        this.rootPage = HomePage;
        unsubscribe();
      }


    });
  }

  logOut() {
    console.log("Logged Out!");

    this.auth.logoutUser().then(() => {
      this.nav.setRoot(LoginPage);
    })
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

