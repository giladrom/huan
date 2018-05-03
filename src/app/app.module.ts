import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import {
  IonicApp,
  IonicErrorHandler,
  IonicModule,
  NavController,
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
import { SettingsPage } from '../pages/settings/settings';
import { SettingsProvider } from '../providers/settings/settings';
import { TagListPage } from '../pages/tag-list/tag-list';
import { ChartModule } from 'angular2-chartjs';
import { AppVersion } from '@ionic-native/app-version';
import { EditPage } from '../pages/edit/edit';
import { SplashScreen } from '@ionic-native/splash-screen';

import { HockeyApp } from 'ionic-hockeyapp';
import { AddPageModule } from '../pages/add/add.module';
import { ShowPageModule } from '../pages/show/show.module';
import { LoginPageModule } from '../pages/login/login.module';
import { SettingsPageModule } from '../pages/settings/settings.module';
import { TagListPageModule } from '../pages/tag-list/tag-list.module';
import { EditPageModule } from '../pages/edit/edit.module';
import { InitProvider } from '../providers/init/init';
import { OrderTagPageModule } from '../pages/order-tag/order-tag.module';
import { ChooseSubscriptionPageModule } from '../pages/choose-subscription/choose-subscription.module';
import { ConfirmSubscriptionPageModule } from '../pages/confirm-subscription/confirm-subscription.module';
import { GetStartedPopoverPageModule } from '../pages/get-started-popover/get-started-popover.module';
import { PhoneNumberLoginPageModule } from '../pages/phone-number-login/phone-number-login.module';
import { MarkerProvider } from '../providers/marker/marker';
import { PhoneNumberLoginPage } from '../pages/phone-number-login/phone-number-login';
import { WindowProvider } from '../providers/window/window';
import { EmailLoginPageModule } from '../pages/email-login/email-login.module';
import { EmailLoginPage } from '../pages/email-login/email-login';
import { SignupPageModule } from '../pages/signup/signup.module';
import { SignupPage } from '../pages/signup/signup';

// Pro.init('abdad7ef', {
//   appVersion: '0.0.3'
// });

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
  declarations: [MyApp, HomePage],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig),
    //AngularFirestoreModule.enablePersistence(),
    AngularFirestoreModule,
    AngularFireAuthModule,
    HttpModule,
    HttpClientModule,
    ChartModule,
    AddPageModule,
    ShowPageModule,
    LoginPageModule,
    SettingsPageModule,
    TagListPageModule,
    EditPageModule,
    OrderTagPageModule,
    ChooseSubscriptionPageModule,
    ConfirmSubscriptionPageModule,
    GetStartedPopoverPageModule,
    PhoneNumberLoginPageModule,
    EmailLoginPageModule,
    SignupPageModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
    AddPage,
    ShowPage,
    SettingsPage,
    TagListPage,
    EditPage,
    PhoneNumberLoginPage,
    EmailLoginPage,
    SignupPage
  ],
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
    WindowProvider
  ]
})
export class AppModule {}
