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

// Page Modules
import { AccountPageModule } from '../pages/account/account.module';
import { AddPageModule } from '../pages/add/add.module';
import { ChooseSubscriptionPageModule } from '../pages/choose-subscription/choose-subscription.module';
import { ConfirmSubscriptionPageModule } from '../pages/confirm-subscription/confirm-subscription.module';
import { EditPageModule } from '../pages/edit/edit.module';
import { EmailLoginPageModule } from '../pages/email-login/email-login.module';
import { FoundPetPageModule } from '../pages/found-pet/found-pet.module';
import { GetStartedPopoverPageModule } from '../pages/get-started-popover/get-started-popover.module';
import { HomePageModule } from '../pages/home/home.module';
import { IncompatibleTagPageModule } from '../pages/incompatible-tag/incompatible-tag.module';
import { LoginPageModule } from '../pages/login/login.module';
import { OrderTagPageModule } from '../pages/order-tag/order-tag.module';
import { PhoneNumberLoginPageModule } from '../pages/phone-number-login/phone-number-login.module';
import { ResetPasswordPageModule } from '../pages/reset-password/reset-password.module';
import { SettingsPageModule } from '../pages/settings/settings.module';
import { ShowPageModule } from '../pages/show/show.module';
import { SignupPageModule } from '../pages/signup/signup.module';
import { TagListPageModule } from '../pages/tag-list/tag-list.module';

Pro.init('abdad7ef', {
  appVersion: '0.0.21'
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
      animate: false
    }),
    AngularFireModule.initializeApp(firebaseConfig),
    //AngularFirestoreModule.enablePersistence(),
    AngularFirestoreModule,
    AngularFireAuthModule,
    HttpModule,
    HttpClientModule,
    ChartModule,

    AccountPageModule,
    AddPageModule,
    ChooseSubscriptionPageModule,
    ConfirmSubscriptionPageModule,
    EditPageModule,
    EmailLoginPageModule,
    FoundPetPageModule,
    GetStartedPopoverPageModule,
    HomePageModule,
    IncompatibleTagPageModule,
    LoginPageModule,
    OrderTagPageModule,
    PhoneNumberLoginPageModule,
    ResetPasswordPageModule,
    SettingsPageModule,
    ShowPageModule,
    SignupPageModule,
    TagListPageModule
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
    SMS
  ]
})
export class AppModule {}
