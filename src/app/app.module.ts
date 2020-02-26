import { HttpModule } from "@angular/http";
import { HttpClientModule } from "@angular/common/http";

import { BrowserModule } from "@angular/platform-browser";
import { NgModule, Injector } from "@angular/core";
import {
  IonicApp,
  IonicErrorHandler,
  IonicModule,
  Slides
} from "ionic-angular";
import { Keyboard } from "@ionic-native/keyboard";
import { StatusBar } from "@ionic-native/status-bar";
import { Toast } from "@ionic-native/toast";

// for AngularFireDatabase
import { AngularFireModule } from "@angular/fire";
import { AngularFirestoreModule } from "@angular/fire/firestore";
import { AngularFireAuthModule, AngularFireAuth } from "@angular/fire/auth";
import { AngularFireDatabaseModule } from "@angular/fire/database";
import {
  AngularFireFunctions,
  AngularFireFunctionsModule
} from "@angular/fire/functions";

import { MyApp } from "./app.component";
import { GoogleMaps } from "@ionic-native/google-maps";

// Camera Access
import { Camera } from "@ionic-native/camera";
import { ImageProvider } from "../providers/image/image";

// Login and Auth
import { AuthProvider } from "../providers/auth/auth";
import { Facebook } from "@ionic-native/facebook";
import { AndroidPermissions } from "@ionic-native/android-permissions";

// Geolocation
import { Geolocation } from "@ionic-native/geolocation/ngx";
import { LocationProvider } from "../providers/location/location";
import { NativeGeocoder } from "@ionic-native/native-geocoder";
import { UtilsProvider } from "../providers/utils/utils";

// BLE/Tag
import { TagProvider } from "../providers/tag/tag";
import { BLE } from "@ionic-native/ble";
import { BleProvider } from "../providers/ble/ble";
import { IBeacon } from "@ionic-native/ibeacon";

// Notifications
import { NotificationProvider } from "../providers/notification/notification";
import { SettingsProvider } from "../providers/settings/settings";
import { ChartModule } from "angular2-chartjs";
import { AppVersion } from "@ionic-native/app-version";
import { SplashScreen } from "@ionic-native/splash-screen";

import { InitProvider } from "../providers/init/init";
import { MarkerProvider } from "../providers/marker/marker";
import { WindowProvider } from "../providers/window/window";

// Call/SMS for found pet page
import { SMS } from "@ionic-native/sms";

// Image Preloader
import { IonicImageLoader } from "ionic-image-loader";

import { IsDebug } from "@ionic-native/is-debug";
import { SocialSharing } from "@ionic-native/social-sharing";
import { GooglePlus } from "@ionic-native/google-plus";
import { Badge } from "@ionic-native/badge";

import { firebaseConfig } from "./credentials";
import { Network } from "@ionic-native/network";

import { SelectSearchableModule } from "ionic-select-searchable";
import { WebView } from "@ionic-native/ionic-webview/ngx";

import { NativeStorage } from "@ionic-native/native-storage";

// Invites
// import { ProgressBarModule } from 'angular-progress-bar';
import { BranchIo } from "@ionic-native/branch-io";
import { SelectDropDownModule } from "ngx-select-dropdown";
import { FormsModule } from "@angular/forms";

import { ApplePay } from "@ionic-native/apple-pay";
import { Mixpanel, MixpanelPeople } from "@ionic-native/mixpanel";
import { SensorProvider } from "../providers/sensor/sensor";
import { AppRate } from "@ionic-native/app-rate";
import { ModalController } from "ionic-angular";

import { SearchPartyProvider } from "../providers/search-party/search-party";
import { Device } from "@ionic-native/device";
import { Contacts } from "@ionic-native/contacts";
import { IonicSelectableModule } from "ionic-selectable";
import { InAppBrowser } from "@ionic-native/in-app-browser";

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
    AngularFireFunctionsModule,
    HttpModule,
    HttpClientModule,
    ChartModule,
    IonicImageLoader.forRoot(),
    SelectSearchableModule,
    FormsModule,
    SelectDropDownModule,
    IonicSelectableModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [MyApp],
  providers: [
    SplashScreen,
    NotificationProvider,
    StatusBar,
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
    SearchPartyProvider,
    BLE,
    BleProvider,
    IonicErrorHandler,
    IBeacon,
    AngularFireAuth,
    AngularFireFunctions,
    Facebook,
    Slides,
    AppVersion,
    Toast,
    Keyboard,
    InitProvider,
    MarkerProvider,
    AndroidPermissions,
    WindowProvider,
    SMS,
    IsDebug,
    SocialSharing,
    GooglePlus,
    Badge,
    Network,
    WebView,
    NativeStorage,
    BranchIo,
    Mixpanel,
    MixpanelPeople,
    ApplePay,
    SensorProvider,
    AppRate,
    ModalController,
    SearchPartyProvider,
    Device,
    Contacts,
    InAppBrowser
  ]
})
export class AppModule {
  /* Allows for retrieving singletons using`AppModule.injector.get(MyService)`
   * This is good to prevent injecting the service as constructor parameter.
   */

  static injector: Injector;
  // constructor(injector: Injector) {
  //   AppModule.injector = injector;
  // }

  constructor() // private afs: AngularFirestore,

  {
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
