import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule, NavController } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';

// for AngularFireDatabase
import { AngularFireModule } from 'angularfire2';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { AngularFirestore } from 'angularfire2/firestore';

import { AngularFireStorageModule } from 'angularfire2/storage';
import { AngularFireAuthModule, 
  AngularFireAuthProvider, 
  AngularFireAuth } from 'angularfire2/auth';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { AddPage } from '../pages/add/add';
import { ShowPage } from '../pages/show/show';
import { GoogleMaps } from '@ionic-native/google-maps';

// Camera Access
import { Camera } from '@ionic-native/camera';
import { ImageProvider } from '../providers/image/image';
import { LoginPage } from '../pages/login/login';
import { AuthProvider } from '../providers/auth/auth';
import { ResetPasswordPage } from '../pages/reset-password/reset-password';
import { SignupPage } from '../pages/signup/signup';

import { Geolocation } from '@ionic-native/geolocation';
import { LocationProvider } from '../providers/location/location';
import { NativeGeocoder, NativeGeocoderReverseResult, NativeGeocoderForwardResult } from '@ionic-native/native-geocoder';
import { UtilsProvider } from '../providers/utils/utils';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { BleProvider } from '../providers/ble/ble';
import { BLE } from '@ionic-native/ble';
import { TagProvider } from '../providers/tag/tag';

// Initialize Firebase 
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
    LoginPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig),
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
    AddPage,
    ShowPage,
    LoginPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    GoogleMaps,
    Camera,
    ImageProvider,
    AuthProvider,
    AngularFirestore,
    AngularFireAuth,
    Geolocation,
    LocationProvider,
    NativeGeocoder,
    UtilsProvider,
    BLE,
    BleProvider,
    TagProvider,
    ]
})
export class AppModule {}
