import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import {
  IonicApp,
  IonicErrorHandler,
  IonicModule,
  Slides
} from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { StatusBar } from '@ionic-native/status-bar';
import { Toast } from '@ionic-native/toast';

// for AngularFireDatabase
import { AngularFireModule } from 'angularfire2';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { AngularFireAuthModule, AngularFireAuth } from 'angularfire2/auth';

import { MyApp } from './app.component';
import { GoogleMaps } from '@ionic-native/google-maps';

// Camera Access
import { Camera } from '@ionic-native/camera';
import { ImageProvider } from '../providers/image/image';

// Login and Auth
import { AuthProvider } from '../providers/auth/auth';
import { Facebook } from '@ionic-native/facebook';
import { AndroidPermissions } from '@ionic-native/android-permissions';

// Geolocation
import { Geolocation } from '@ionic-native/geolocation';
import { LocationProvider } from '../providers/location/location';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { UtilsProvider } from '../providers/utils/utils';

// BLE/Tag
import { TagProvider } from '../providers/tag/tag';
import { BLE } from '@ionic-native/ble';
import { BleProvider } from '../providers/ble/ble';
import { IBeacon } from '@ionic-native/ibeacon';

import { Pro } from '@ionic/pro';
import { Injectable, Injector } from '@angular/core';

// Notifications
import { FCM } from '@ionic-native/fcm';
import { QrProvider } from '../providers/qr/qr';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { NotificationProvider } from '../providers/notification/notification';
import { SettingsProvider } from '../providers/settings/settings';
import { ChartModule } from 'angular2-chartjs';
import { AppVersion } from '@ionic-native/app-version';
import { SplashScreen } from '@ionic-native/splash-screen';

import { InitProvider } from '../providers/init/init';
import { MarkerProvider } from '../providers/marker/marker';
import { WindowProvider } from '../providers/window/window';
import { InAppPurchase } from '@ionic-native/in-app-purchase';

// Call/SMS for found pet page
import { CallNumber } from '@ionic-native/call-number';
import { SMS } from '@ionic-native/sms';

// HockeyApp
import { HockeyApp } from 'ionic-hockeyapp';

// Image Preloader
import { IonicImageLoader } from 'ionic-image-loader';

Pro.init('abdad7ef', {
  appVersion: '0.0.30'
});

@Injectable()
export class MyErrorHandler implements ErrorHandler {
  ionicErrorHandler: IonicErrorHandler;

  constructor(injector: Injector) {
    try {
      this.ionicErrorHandler = injector.get(IonicErrorHandler);
    } catch (e) {
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
  apiKey: 'AIzaSyC9oTsqa4b56IykDq5tr5McfgA4uM4T0rQ',
  authDomain: 'huan-33de0.firebaseapp.com',
  databaseURL: 'https://huan-33de0.firebaseio.com',
  projectId: 'huan-33de0',
  storageBucket: 'huan-33de0.appspot.com',
  messagingSenderId: '543452999987'
};

@NgModule({
  declarations: [MyApp],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      animate: false,
      preloadModules: true
    }),
    AngularFireModule.initializeApp(firebaseConfig),
    //AngularFirestoreModule.enablePersistence(),
    AngularFirestoreModule,
    AngularFireAuthModule,
    HttpModule,
    HttpClientModule,
    ChartModule,
    IonicImageLoader.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [MyApp],
  providers: [
    SplashScreen,
    NotificationProvider,
    StatusBar,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    GoogleMaps,
    Camera,
    ImageProvider,
    AuthProvider,
    Geolocation,
    LocationProvider,
    NativeGeocoder,
    UtilsProvider,
    TagProvider,
    SettingsProvider,
    BLE,
    BleProvider,
    IonicErrorHandler,
    [{ provide: ErrorHandler, useClass: MyErrorHandler }],
    IBeacon,
    AngularFireAuth,
    FCM,
    BarcodeScanner,
    QrProvider,
    Facebook,
    Slides,
    AppVersion,
    Toast,
    Keyboard,
    HockeyApp,
    InitProvider,
    MarkerProvider,
    AndroidPermissions,
    WindowProvider,
    InAppPurchase,
    CallNumber,
    SMS,
    IonicImageLoader
  ]
})
export class AppModule {}
