import { Component, ViewChild } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  Slides,
  Platform,
  MenuController
} from "ionic-angular";
import { Validators, FormBuilder, FormGroup } from "@angular/forms";
import { Keyboard } from "@ionic-native/keyboard";
import { WindowProvider } from "../../providers/window/window";

import { firebase } from "@firebase/app";
import "@firebase/auth";

// import "@firebase/firestore";

import { AuthProvider } from "../../providers/auth/auth";

@IonicPage()
@Component({
  selector: "page-phone-number-login",
  templateUrl: "phone-number-login.html"
})
export class PhoneNumberLoginPage {
  @ViewChild(Slides) slides: Slides;
  windowRef: any;

  private phoneForm: FormGroup;
  private phoneNumber: any;
  private verificationCode: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private keyboard: Keyboard,
    private platform: Platform,
    private menu: MenuController,
    private window: WindowProvider,
    private authProvider: AuthProvider
  ) {
    this.phoneForm = this.formBuilder.group({
      phoneNumber: [
        "",
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(10),
          Validators.pattern("^[0-9]+$")
        ]
      ],
      verificationCode: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern("^[0-9]+$")
        ]
      ]
    });

    this.platform.ready().then(() => {
      this.slides.lockSwipes(false);
      this.menu.swipeEnable(false);
    });

    this.windowRef = this.window.nativeWindow;
  }

  ionViewDidEnter() {
    this.windowRef.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "verifyCode",
      {
        size: "invisible",
        callback: function(response) {
          console.log("reCAPTCHA Solved: " + response);
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          // onSignInSubmit();
        }
      }
    );

    //this.windowRef.recaptchaVerifier.render();
  }

  // format phone numbers as E.164
  get e164() {
    return `+1${this.phoneNumber}`;
  }

  sendVerificationCode() {
    this.keyboard.hide();
    this.slides.lockSwipes(false);
    this.slides.slideNext(500);
    this.slides.lockSwipes(true);

    this.authProvider.sendLoginCode(this.windowRef, this.e164);
  }

  verifyCode() {
    this.keyboard.hide();

    this.authProvider.verifyLoginCode(this.windowRef, this.verificationCode);
  }

  goBack() {
    this.slides.lockSwipes(false);
    this.slides.slidePrev(500);
    this.slides.lockSwipes(true);
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad PhoneNumberLoginPage");
  }
}
