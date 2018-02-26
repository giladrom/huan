import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';
import { AngularFireAuth } from 'angularfire2/auth';

import { BleProvider } from '../providers/ble/ble';

@Component({
  templateUrl: 'app.html',
})

export class MyApp {
  rootPage:any;

  constructor(platform: Platform, 
    statusBar: StatusBar, 
    splashScreen: SplashScreen,
    ble: BleProvider,
    afAuth: AngularFireAuth) {

    //this.rootPage = LoginPage;

    splashScreen.show();

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();

      //this.rootPage = HomePage;
      
    });


    
    const unsubscribe = afAuth.auth.onAuthStateChanged( user => {
      if (!user) {
        this.rootPage = LoginPage;
        unsubscribe();
      } else { 
        this.rootPage = HomePage;
        unsubscribe();
      }
    });
    
 
  }
}

