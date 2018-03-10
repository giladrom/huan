import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule, NavController, Slides } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';

// for AngularFireDatabase
import { AngularFireModule } from 'angularfire2';
import { AngularFirestoreModule } from 'angularfire2/firestore';
//import { AngularFirestore } from 'angularfire2/firestore';

//import { AngularFireStorageModule } from 'angularfire2/storage';
import { AngularFireAuthModule, AngularFireAuth } from 'angularfire2/auth';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { AddPage } from '../pages/add/add';
import { ShowPage } from '../pages/show/show';
import { GoogleMaps } from '@ionic-native/google-maps';

// Camera Access
import { Camera } from '@ionic-native/camera';
import { ImageProvider } from '../providers/image/image';

// Login and Auth 
import { LoginPage } from '../pages/login/login';
import { AuthProvider } from '../providers/auth/auth';
//import { ResetPasswordPage } from '../pages/reset-password/reset-password';
//import { SignupPage } from '../pages/signup/signup';
import { Facebook } from '@ionic-native/facebook';

// Geolocation
import { Geolocation } from '@ionic-native/geolocation';
import { LocationProvider } from '../providers/location/location';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { UtilsProvider } from '../providers/utils/utils';
//import { HttpClient, HttpHandler } from '@angular/common/http';

// BLE/Tag
import { TagProvider } from '../providers/tag/tag';
import { BLE } from '@ionic-native/ble';
import { BleProvider } from '../providers/ble/ble';


import { Pro } from '@ionic/pro';
import { Injectable, Injector } from '@angular/core';

import { IBeacon } from '@ionic-native/ibeacon';

// Notifications
//import { LocalNotifications } from '@ionic-native/local-notifications';
import { FCM } from '@ionic-native/fcm';
import { QrProvider } from '../providers/qr/qr';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { NotificationProvider } from '../providers/notification/notification';
import { SettingsPage } from '../pages/settings/settings';

Pro.init('abdad7ef', {
  appVersion: '0.0.1'
})

@Injectable()
export class MyErrorHandler implements ErrorHandler {
  ionicErrorHandler: IonicErrorHandler;

  constructor(injector: Injector) {
    try {
      this.ionicErrorHandler = injector.get(IonicErrorHandler);
    } catch(e) {
      // Unable to get the IonicErrorHandler provider, ensure
      // IonicErrorHandler has been added to the providers list below
    }
  }

  handleError(err: any): void {
    Pro.monitoring.handleNewError(err);
    // Remove this if you want to disable Ionic's auto exception handling
    // in development mode.
    this.ionicErrorHandler && this.ionicErrorHandler.handleError(err);
  }
}

// Initialize Firebase configuration 
export const firebaseConfig = {
  apiKey: "AIzaSyC9oTsqa4b56IykDq5tr5McfgA4uM4T0rQ",
  authDomain: "huan-33de0.firebaseapp.com",
  databaseURL: "https://huan-33de0.firebaseio.com",
  projectId: "huan-33de0",
  storageBucket: "huan-33de0.appspot.com",
  messagingSenderId: "543452999987"
};

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    AddPage,
    ShowPage,
    LoginPage,
    SettingsPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFirestoreModule.enablePersistence(),
    AngularFirestoreModule,
    AngularFireAuthModule,
    HttpModule,
    HttpClientModule
    ],
  bootstrap: [
    IonicApp
  ],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
    AddPage,
    ShowPage,
    SettingsPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    GoogleMaps,
    Camera,
    ImageProvider,
    AuthProvider,
    Geolocation,
    LocationProvider,
    NativeGeocoder,
    UtilsProvider,
    BLE,
    BleProvider,
    TagProvider,
    IonicErrorHandler,
        [{ provide: ErrorHandler, useClass: MyErrorHandler }],
    IBeacon,
    AngularFireAuth,
    FCM,
    BarcodeScanner,
    QrProvider,
    Facebook,
    Slides,
    NotificationProvider
    ]
})
export class AppModule {}
