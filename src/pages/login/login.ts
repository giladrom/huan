import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Loading,
  LoadingController,
  AlertController,
  Platform,
  normalizeURL,
  MenuController
} from 'ionic-angular';
import { ViewChild } from '@angular/core';

import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { EmailValidator } from '../../validators/email';
import { AuthProvider } from '../../providers/auth/auth';
import { Slides } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';

import { AppVersion } from '@ionic-native/app-version';
import { InitProvider } from '../../providers/init/init';
import { AndroidPermissions } from '@ionic-native/android-permissions';

import { SplashScreen } from '@ionic-native/splash-screen';
import { UtilsProvider } from '../../providers/utils/utils';
import { StatusBar } from '@ionic-native/status-bar';

@IonicPage({ priority: 'high' })
@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {
  public loginForm: FormGroup;
  public loading: Loading;

  private allowLocationImage: String;
  private allowNotificationsImage: String;

  private showLogin: Boolean;
  private showVersion: Boolean;
  private showSlides: Boolean;
  private fadeSlides: Boolean;

  private slide_background = [
    'linear-gradient(to right, #a3bded,#6991c7)',
    'linear-gradient(to right, #accbee,#e7f0fd)',
    'linear-gradient(to right, #f5f7fa,#c3cfe2)',
    'linear-gradient(to right, #a8edea,#fed6e3)',
    'linear-gradient(to right, #4facfe,#00f2fe)',
    'linear-gradient(to right, #43e97b,#38f9d7)'
  ];

  // private showLocation;
  version: String;

  @ViewChild(Slides) slides: Slides;

  private loader;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public authProvider: AuthProvider,
    public formBuilder: FormBuilder,
    private ibeacon: IBeacon,
    private platform: Platform,
    private appVersion: AppVersion,
    private init: InitProvider,
    private androidPermissions: AndroidPermissions,
    private menu: MenuController,
    private splashscreen: SplashScreen,
    private utilsProvider: UtilsProvider,
    private statusBar: StatusBar
  ) {
    console.log('Initializing login view');

    this.showLogin = false;
    // this.showVersion = true;
    this.showSlides = true;
    this.fadeSlides = false;
    this.allowLocationImage = normalizeURL('assets/imgs/allow-location.png');
    this.allowNotificationsImage = normalizeURL(
      'assets/imgs/allow-notifications.png'
    );

    this.loginForm = formBuilder.group({
      email: [
        '',
        Validators.compose([Validators.required, EmailValidator.isValid])
      ],
      password: [
        '',
        Validators.compose([
          Validators.minLength(6),
          Validators.maxLength(32),
          Validators.required
        ])
      ]
    });

    platform.ready().then(() => {
      this.menu.swipeEnable(false);

      if (platform.is('ios')) {
        // this.statusBar.show();
        // this.statusBar.overlaysWebView(false);
        // this.statusBar.backgroundColorByHexString('#0000');
        // this.statusBar.styleBlackOpaque();

        this.ibeacon.getAuthorizationStatus().then(authStatus => {
          console.log('Auth Status: ' + authStatus.authorizationStatus);

          if (
            authStatus.authorizationStatus == 'AuthorizationStatusAuthorized'
          ) {
            // XXX FOR TESTING ONLY
            // UNCOMMENT
            this.showSlides = false;
            this.showLoginButtons();
            // UNCOMMENT
            // XXX FOR TESTING ONLY
          }
        });
      }

      if (platform.is('android')) {
        this.androidPermissions
          .checkPermission(
            this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION
          )
          .then(
            result => {
              if (result.hasPermission) {
                // XXX FOR TESTING ONLY
                // UNCOMMENT
                this.showSlides = false;
                this.showLoginButtons();
                // UNCOMMENT
                // XXX FOR TESTING ONLY
              }
            },
            err =>
              this.androidPermissions.requestPermission(
                this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION
              )
          );
      }
    });
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: 'Please Wait...'
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
  }

  nextSlide() {
    this.showVersion = false;

    this.slides.lockSwipes(false);
    this.slides.slideNext();
    document.getElementById(
      'content'
    ).style.background = this.slide_background.pop();

    // document.getElementById('content').style.backgroundSize = 'cover';
    this.slides.lockSwipes(true);
  }

  showLoginButtons() {
    this.fadeSlides = true;
    this.showSlides = false;

    document.getElementById('content').style.animation = 'fadeout 0.5s';

    window.setTimeout(() => {
      this.showSlides = false;

      document.getElementById('content').style.background =
        "url('assets/imgs/background1.jpg') no-repeat center center fixed";
      document.getElementById('content').style.backgroundSize = 'cover';
      document.getElementById('content').style.animation = 'fadein 0.5s';
    }, 500);

    window.setTimeout(() => {
      this.showLogin = true;
    }, 1000);
  }

  promptForLocation() {
    document.getElementById(
      'content'
    ).style.background = this.slide_background.pop();

    // Request permission to use location on iOS - required for background scanning
    this.ibeacon.getAuthorizationStatus().then(authStatus => {
      console.log(authStatus.authorizationStatus);

      this.ibeacon
        .requestAlwaysAuthorization()
        .then(() => {
          console.log('Enabled Always Location Authorization');
        })
        .catch(error => {
          console.log('Unable to enable location authorization: ' + error);
        });
    });

    this.nextSlide();
  }

  promptForNotifications() {}

  loginUserAnonymously() {
    this.showLoading();

    this.authProvider.loginAnonymous().then(
      authData => {
        console.log('loginUserAnonymously: Success');
        this.dismissLoading();
      },
      error => {
        this.dismissLoading();

        this.utilsProvider.displayAlert('Unable to Login', error.message);
      }
    );
  }

  loginUserWithFacebook() {
    this.showLoading();

    this.authProvider.loginFacebook().then(
      authData => {
        console.log('loginUserWithFacebook: Success');
        this.dismissLoading();
      },
      error => {
        this.dismissLoading();

        this.utilsProvider.displayAlert('Unable to Login', error.message);
      }
    );
  }

  loginUserWithGoogle() {
    this.showLoading();

    this.authProvider.loginGoogle().then(
      authData => {
        console.log('loginUserWithGoogle: Success');
        this.dismissLoading();
      },
      error => {
        this.dismissLoading();

        this.utilsProvider.displayAlert('Unable to Login', error.message);
      }
    );
  }

  loginUserWithEmail() {
    this.navCtrl.push('EmailLoginPage');
  }

  loginUserWithPhoneNumber() {
    this.navCtrl.push('PhoneNumberLoginPage');
  }

  // userHasLoggedIn() {
  //   this.init.initializeApp();

  //   this.loading.dismiss().then(() => {
  //     this.navCtrl.setRoot('HomePage');
  //   });
  // }

  goToSignup(): void {
    this.navCtrl.push('SignupPage');
  }

  goToResetPassword(): void {
    this.navCtrl.push('ResetPasswordPage');
  }

  ionViewDidLoad() {
    this.platform.ready().then(() => {
      if (this.slides) {
        this.slides.pager = false;
        this.slides.lockSwipes(true);
      }
    });
  }

  ionViewDidEnter() {
    this.splashscreen.hide();
  }

  ionViewWillLoad() {
    console.log('ionViewWillLoad LoginPage');
    this.platform.ready().then(() => {
      this.appVersion
        .getVersionCode()
        .then(version => {
          console.log('Version: ' + version);
          this.version = version.toString();
        })
        .catch(err => {
          console.error('Unable to retrieve Version number: ' + err);
        });
    });
  }
}
