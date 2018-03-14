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

@Component({
  templateUrl: 'app.html',
})

export class MyApp {
  rootPage: any;
  splash = true;

  @ViewChild(Nav) nav: Nav;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    ble: BleProvider,
    private afAuth: AngularFireAuth,
    private auth: AuthProvider,
    private settings: SettingsProvider) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      setTimeout(() => this.splash = false, 3500);
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

