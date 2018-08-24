import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule, Optional, SkipSelf } from '@angular/core';
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
import {
  AngularFirestoreModule,
  AngularFirestore
} from 'angularfire2/firestore';
import { AngularFireAuthModule, AngularFireAuth } from 'angularfire2/auth';
import { AngularFireDatabaseModule } from 'angularfire2/database';

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

import { IsDebug } from '@ionic-native/is-debug';
import { SocialSharing } from '@ionic-native/social-sharing';
import { GooglePlus } from '@ionic-native/google-plus';
import { Badge } from '@ionic-native/badge';

import { firebaseConfig } from './credentials';
import { Network } from '@ionic-native/network';

Pro.init('abdad7ef', {
  appVersion: '1.0.1'
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

@NgModule({
  declarations: [MyApp],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      animate: true,
      preloadModules: true
    }),
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AngularFirestoreModule,
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
    IonicImageLoader,
    IsDebug,
    SocialSharing,
    GooglePlus,
    Badge,
    Network
  ]
})
export class AppModule {
  constructor(private afs: AngularFirestore, private afm: AngularFireModule) {
    afs.firestore.settings({
      timestampsInSnapshots: true
    });

    // try {
    //   afs.firestore
    //     .enablePersistence()
    //     .then(res => {
    //       console.log('Enabled Firestore persistence mode');
    //     })
    //     .catch(e => {
    //       console.error(
    //         'Unable to enable persistence mode: ' + JSON.stringify(e)
    //       );
    //     });
    // } catch (e) {
    //   console.warn(e);
    // }
  }
}
