var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, AlertController, Platform, MenuController } from 'ionic-angular';
import { ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { EmailValidator } from '../../validators/email';
import { AuthProvider } from '../../providers/auth/auth';
import { Slides } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';
import { AppVersion } from '@ionic-native/app-version';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { SplashScreen } from '@ionic-native/splash-screen';
import { UtilsProvider } from '../../providers/utils/utils';
import { Mixpanel } from '@ionic-native/mixpanel';
var LoginPage = /** @class */ (function () {
    function LoginPage(navCtrl, navParams, loadingCtrl, alertCtrl, authProvider, formBuilder, ibeacon, platform, appVersion, androidPermissions, menu, splashscreen, utilsProvider, mixpanel) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.loadingCtrl = loadingCtrl;
        this.alertCtrl = alertCtrl;
        this.authProvider = authProvider;
        this.formBuilder = formBuilder;
        this.ibeacon = ibeacon;
        this.platform = platform;
        this.appVersion = appVersion;
        this.androidPermissions = androidPermissions;
        this.menu = menu;
        this.splashscreen = splashscreen;
        this.utilsProvider = utilsProvider;
        this.mixpanel = mixpanel;
        /*  private slide_background = [
          'linear-gradient(to right, #a3bded,#6991c7)',
          'linear-gradient(to right, #accbee,#e7f0fd)',
          'linear-gradient(to right, #f5f7fa,#c3cfe2)',
          'linear-gradient(to right, #a8edea,#fed6e3)',
          'linear-gradient(to right, #4facfe,#00f2fe)',
          'linear-gradient(to right, #43e97b,#38f9d7)'
        ]; */
        this.slide_background = [
            'linear-gradient(to top, #09203f 0%, #537895 100%)',
            'linear-gradient(to top, #09203f 0%, #537895 100%)',
            'linear-gradient(to top, #09203f 0%, #537895 100%)',
            'linear-gradient(to top, #09203f 0%, #537895 100%)',
            'linear-gradient(to top, #09203f 0%, #537895 100%)',
            'linear-gradient(to top, #09203f 0%, #537895 100%)'
        ];
        this.win = window;
        console.log('Initializing login view');
        this.showLogin = false;
        // this.showVersion = true;
        this.showSlides = true;
        this.fadeSlides = false;
        // this.allowLocationImage = normalizeURL('assets/imgs/allow-location.png');
        // this.allowNotificationsImage = normalizeURL(
        //   'assets/imgs/allow-notifications.png'
        // );
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
        platform.ready().then(function () {
            _this.menu.swipeEnable(false);
            if (platform.is('ios')) {
                // this.statusBar.show();
                // this.statusBar.overlaysWebView(false);
                // this.statusBar.backgroundColorByHexString('#0000');
                // this.statusBar.styleBlackOpaque();
                // this.ibeacon.getAuthorizationStatus().then(authStatus => {
                //   console.log('Auth Status: ' + authStatus.authorizationStatus);
                //   if (
                //     authStatus.authorizationStatus == 'AuthorizationStatusAuthorized'
                //   ) {
                //     // XXX FOR TESTING ONLY
                //     // UNCOMMENT IN PRODUCTION
                //     // this.showSlides = false;
                //     // this.showLoginButtons();
                //     // UNCOMMENT IN PRODUCTION
                //     // XXX FOR TESTING ONLY
                //   }
                // });
            }
            if (platform.is('android')) {
                _this.androidPermissions
                    .checkPermission(_this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
                    .then(function (result) {
                    if (result.hasPermission) {
                        // XXX FOR TESTING ONLY
                        // UNCOMMENT IN PRODUCTION
                        // this.showSlides = false;
                        // this.showLoginButtons();
                        // UNCOMMENT IN PRODUCTION
                        // XXX FOR TESTING ONLY
                    }
                }, function (err) {
                    return _this.androidPermissions.requestPermission(_this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION);
                });
            }
        });
    }
    LoginPage.prototype.showLoading = function () {
        if (!this.loader) {
            this.loader = this.loadingCtrl.create({
                content: 'Please Wait...'
            });
            this.loader.present();
        }
    };
    LoginPage.prototype.dismissLoading = function () {
        if (this.loader) {
            this.loader.dismiss();
            this.loader = null;
        }
    };
    LoginPage.prototype.nextSlide = function () {
        this.showVersion = false;
        this.slides.lockSwipes(false);
        this.slides.slideNext();
        document.getElementById('content').style.background = this.slide_background.pop();
        // document.getElementById('content').style.backgroundSize = 'cover';
        this.slides.lockSwipes(true);
    };
    LoginPage.prototype.showLoginButtons = function () {
        var _this = this;
        this.fadeSlides = true;
        this.showSlides = false;
        document.getElementById('content').style.animation = 'fadeout 0.5s';
        window.setTimeout(function () {
            _this.showSlides = false;
            // document.getElementById('content').style.background =
            //   "url('assets/imgs/background1.jpg') no-repeat center center fixed";
            // document.getElementById('content').style.backgroundSize = 'cover';
            document.getElementById('content').style.animation = 'fadein 0.5s';
        }, 500);
        window.setTimeout(function () {
            _this.showLogin = true;
        }, 1000);
    };
    LoginPage.prototype.promptForLocation = function () {
        var _this = this;
        document.getElementById('content').style.background = this.slide_background.pop();
        // Request permission to use location on iOS - required for background scanning
        this.ibeacon.getAuthorizationStatus().then(function (authStatus) {
            console.log(authStatus.authorizationStatus);
            _this.ibeacon
                .requestAlwaysAuthorization()
                .then(function () {
                _this.mixpanel.track('enabled_always_location').then(function () { }).catch(function (e) {
                    console.error('Mixpanel Error', e);
                });
                console.log('Enabled Always Location Authorization');
            })
                .catch(function (error) {
                _this.mixpanel.track('not_enabled_always_location').then(function () { }).catch(function (e) {
                    console.error('Mixpanel Error', e);
                });
                console.log('Unable to enable location authorization: ' + error);
            });
        });
        this.nextSlide();
    };
    LoginPage.prototype.promptForNotifications = function () { };
    LoginPage.prototype.loginUserAnonymously = function () {
        var _this = this;
        this.mixpanel.track('login_anonymous').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.showLoading();
        this.authProvider.loginAnonymous().then(function (authData) {
            console.log('loginUserAnonymously: Success');
            _this.dismissLoading();
        }, function (error) {
            _this.dismissLoading();
            _this.utilsProvider.displayAlert('Unable to Login', error.message);
        });
    };
    LoginPage.prototype.loginUserWithFacebook = function () {
        var _this = this;
        this.mixpanel.track('login_facebook').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.showLoading();
        this.authProvider.loginFacebook().then(function (authData) {
            console.log('loginUserWithFacebook: Success');
            _this.dismissLoading();
        }, function (error) {
            _this.dismissLoading();
            _this.utilsProvider.displayAlert('Unable to Login', error.message);
        });
    };
    LoginPage.prototype.loginUserWithGoogle = function () {
        var _this = this;
        this.mixpanel.track('login_google').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.showLoading();
        this.authProvider
            .loginGoogle()
            .then(function (authData) {
            console.log('loginUserWithGoogle: Success');
            _this.dismissLoading();
        }, function (error) {
            _this.dismissLoading();
            _this.utilsProvider.displayAlert('Unable to Login', error);
        })
            .catch(function (e) {
            _this.dismissLoading();
            _this.utilsProvider.displayAlert('Unable to Login', e);
        });
    };
    LoginPage.prototype.loginUserWithEmail = function () {
        this.mixpanel.track('login_email').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.navCtrl.push('EmailLoginPage');
    };
    LoginPage.prototype.loginUserWithPhoneNumber = function () {
        this.navCtrl.push('PhoneNumberLoginPage');
    };
    // userHasLoggedIn() {
    //   this.init.initializeApp();
    //   this.loading.dismiss().then(() => {
    //     this.navCtrl.setRoot('HomePage');
    //   });
    // }
    LoginPage.prototype.goToSignup = function () {
        this.mixpanel.track('goto_signup').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.navCtrl.push('SignupPage');
    };
    LoginPage.prototype.goToResetPassword = function () {
        this.mixpanel.track('goto_reset_password').then(function () { }).catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.navCtrl.push('ResetPasswordPage');
    };
    LoginPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        this.platform.ready().then(function () {
            if (_this.slides) {
                _this.slides.pager = false;
                _this.slides.lockSwipes(true);
            }
        });
    };
    LoginPage.prototype.ionViewDidEnter = function () {
        this.splashscreen.hide();
    };
    LoginPage.prototype.ionViewWillLoad = function () {
        var _this = this;
        console.log('ionViewWillLoad LoginPage');
        this.platform.ready().then(function () {
            _this.appVersion
                .getVersionCode()
                .then(function (version) {
                console.log('Version: ' + version);
                _this.version = version.toString();
            })
                .catch(function (err) {
                console.error('Unable to retrieve Version number: ' + err);
            });
        });
    };
    __decorate([
        ViewChild(Slides),
        __metadata("design:type", Slides)
    ], LoginPage.prototype, "slides", void 0);
    LoginPage = __decorate([
        IonicPage({ priority: 'high' }),
        Component({
            selector: 'page-login',
            templateUrl: 'login.html'
        }),
        __metadata("design:paramtypes", [NavController,
            NavParams,
            LoadingController,
            AlertController,
            AuthProvider,
            FormBuilder,
            IBeacon,
            Platform,
            AppVersion,
            AndroidPermissions,
            MenuController,
            SplashScreen,
            UtilsProvider,
            Mixpanel])
    ], LoginPage);
    return LoginPage;
}());
export { LoginPage };
//# sourceMappingURL=login.js.map