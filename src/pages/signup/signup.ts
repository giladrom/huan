import { Component } from "@angular/core";
import {
  IonicPage,
  NavController,
  LoadingController,
  AlertController
} from "ionic-angular";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AuthProvider } from "../../providers/auth/auth";
import { SettingsProvider } from "../../providers/settings/settings";
import { Mixpanel } from "@ionic-native/mixpanel";

@IonicPage()
@Component({
  selector: "page-signup",
  templateUrl: "signup.html"
})
export class SignupPage {
  public signupForm: FormGroup;

  private password;
  private passwordVerify;
  private name;
  private email;
  private loader;

  constructor(
    public navCtrl: NavController,
    public authProvider: AuthProvider,
    public settingsProvider: SettingsProvider,
    public formBuilder: FormBuilder,
    public loadingCtrl: LoadingController,
    public alertController: AlertController,
    private mixpanel: Mixpanel
  ) {
    this.signupForm = formBuilder.group({
      name: [
        "",
        Validators.compose([
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(32)
        ])
      ],

      email: ["", Validators.compose([Validators.required, Validators.email])],
      passwords: formBuilder.group(
        {
          password: [
            "",
            Validators.compose([
              Validators.minLength(8),
              Validators.maxLength(32),
              Validators.required
            ])
          ]
          //   passwordVerify: [
          //     '',
          //     Validators.compose([
          //       Validators.minLength(8),
          //       Validators.maxLength(32),
          //       Validators.required
          //     ])
          //   ]
        }
        // { validator: PasswordValidator }
      )
    });

    // XXX TESTING ONLY
    // var rando = this.randomIntFromInterval(5000, 7000);
    // this.name = rando;
    // this.email = `huan${rando}@gethuan.com`;
    // this.password = '12345678';
    // this.passwordVerify = '12345678';
    // // XXX TESTING ONLY
  }

  signupUser() {
    this.mixpanel
      .track("signup_user")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.showLoading();

    this.settingsProvider.setAccountName(this.name);

    this.authProvider
      .signupUser(this.name, this.email, this.password)
      .then(() => {
        this.mixpanel
          .track("signup_user_success")
          .then(() => {})
          .catch(e => {
            console.error("Mixpanel Error", e);
          });
        this.dismissLoading();
      })
      .catch(error => {
        this.dismissLoading();

        this.mixpanel
          .track("signup_user_error")
          .then(() => {})
          .catch(e => {
            console.error("Mixpanel Error", e);
          });
        console.error("signupUser: " + error);
        this.showSignUpError(error);
      });
  }

  showSignUpError(error) {
    let confirm = this.alertController.create({
      title: "Sign Up Error",
      message: error.message,
      buttons: [
        {
          text: "Ok",
          handler: () => {}
        }
      ],
      cssClass: "alertclass"
    });

    confirm.present();
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: "Please Wait..."
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

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  emailLogin() {
    this.navCtrl.push("EmailLoginPage");
  }

  returnHome() {
    this.navCtrl.popToRoot();
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad SignupPage");
  }
}
