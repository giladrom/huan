import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Loading,
  LoadingController,
  AlertController,
  Platform,
  normalizeURL
} from 'ionic-angular';
import { ViewChild } from '@angular/core';

import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { EmailValidator } from '../../validators/email';
import { AuthProvider } from '../../providers/auth/auth';
import { HomePage } from '../home/home';

import { AngularFireAuth } from 'angularfire2/auth';
import { Slides } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import { SettingsProvider } from '../../providers/settings/settings';

import { AppVersion } from '@ionic-native/app-version';
import { InitProvider } from '../../providers/init/init';
import { AndroidPermissions } from '@ionic-native/android-permissions';

@IonicPage()
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

  private showLocation;
  version: String;

  @ViewChild(Slides) slides: Slides;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public authProvider: AuthProvider,
    public formBuilder: FormBuilder,
    private ibeacon: IBeacon,
    private platform: Platform,
    private settings: SettingsProvider,
    private appVersion: AppVersion,
    private init: InitProvider,
    private androidPermissions: AndroidPermissions
  ) {
    console.log('Initializing login view');

    this.showLogin = false;
    this.showVersion = true;
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
        Validators.compose([Validators.minLength(6), Validators.required])
      ]
    });

    platform.ready().then(() => {
      if (platform.is('ios')) {
        this.ibeacon.getAuthorizationStatus().then(authStatus => {
          console.log('Auth Status: ' + authStatus.authorizationStatus);

          if (
            authStatus.authorizationStatus == 'AuthorizationStatusAuthorized'
          ) {
            this.showSlides = false;
            this.showLoginButtons();
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
                this.showSlides = false;
                this.showLoginButtons();
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

  nextSlide() {
    this.showVersion = false;

    this.slides.lockSwipes(false);
    this.slides.slideNext();
    this.slides.lockSwipes(true);
  }

  showLoginButtons() {
    this.fadeSlides = true;

    window.setTimeout(() => {
      this.showLogin = true;
      this.showSlides = false;
    }, 1000);
  }

  promptForLocation() {
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
    this.authProvider.loginAnonymous().then(
      authData => {
        console.log('loginUserAnonymously: Success');

        //this.userHasLoggedIn();
      },
      error => {
        let alert = this.alertCtrl.create({
          message: error.message,
          buttons: [
            {
              text: 'Ok',
              role: 'cancel'
            }
          ]
        });
        alert.present();
      }
    );
  }

  loginUserWithFacebook() {
    this.authProvider.loginFacebook().then(
      authData => {
        console.log('loginUserWithFacebook: Success');

        //this.userHasLoggedIn();
      },
      error => {
        let alert = this.alertCtrl.create({
          message: error.message,
          buttons: [
            {
              text: 'Ok',
              role: 'cancel'
            }
          ]
        });
        alert.present();
      }
    );
  }

  userHasLoggedIn() {
    this.init.initializeApp();

    this.loading.dismiss().then(() => {
      this.navCtrl.setRoot(HomePage);
    });
  }

  loginUser(): void {
    if (!this.loginForm.valid) {
      console.log(this.loginForm.value);
    } else {
      this.authProvider
        .loginUser(this.loginForm.value.email, this.loginForm.value.password)
        .then(
          authData => {
            this.loading.dismiss().then(() => {
              this.navCtrl.setRoot(HomePage);
            });
          },
          error => {
            this.loading.dismiss().then(() => {
              let alert = this.alertCtrl.create({
                message: error.message,
                buttons: [
                  {
                    text: 'Ok',
                    role: 'cancel'
                  }
                ]
              });
              alert.present();
            });
          }
        );
      this.loading = this.loadingCtrl.create();
      this.loading.present();
    }
  }

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

  ionViewWillLoad() {
    console.log('ionViewWillLoad LoginPage');
    this.platform.ready().then(() => {
      this.appVersion
        .getVersionCode()
        .then(version => {
          console.log('Version: ' + version);
          this.version = version;
        })
        .catch(err => {
          console.error('Unable to retrieve Version number: ' + err);
        });
    });
  }
}
