import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  LoadingController,
  AlertController
} from 'ionic-angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthProvider } from '../../providers/auth/auth';
import { PasswordValidator } from '../../validators/password.validator';
import { UtilsProvider } from '../../providers/utils/utils';

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html'
})
export class SignupPage {
  public signupForm: FormGroup;

  private password;
  private passwordVerify;
  private email;
  private loader;

  constructor(
    public navCtrl: NavController,
    public authProvider: AuthProvider,
    public formBuilder: FormBuilder,
    public loadingCtrl: LoadingController,
    public alertController: AlertController,
    private utilsProvider: UtilsProvider
  ) {
    this.signupForm = formBuilder.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      passwords: formBuilder.group(
        {
          password: [
            '',
            Validators.compose([
              Validators.minLength(8),
              Validators.maxLength(32),
              Validators.required
            ])
          ],
          passwordVerify: [
            '',
            Validators.compose([
              Validators.minLength(8),
              Validators.maxLength(32),
              Validators.required
            ])
          ]
        },
        { validator: PasswordValidator }
      )
    });

    // XXX TESTING ONLY
    // var rando = this.randomIntFromInterval(5000, 7000);
    // this.email = `huan${rando}@gethuan.com`;
    // this.password = '12345678';
    // this.passwordVerify = '12345678';
    // // XXX TESTING ONLY
  }

  signupUser() {
    this.showLoading();

    this.authProvider
      .signupUser(this.email, this.password)
      .then(() => {
        this.dismissLoading();
      })
      .catch(error => {
        this.dismissLoading();

        console.error('signupUser: ' + error);
        this.showSignUpError(error);
      });
  }

  showSignUpError(error) {
    let confirm = this.alertController.create({
      title: 'Sign Up Error',
      message: error,
      buttons: [
        {
          text: 'Ok',
          handler: () => {}
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
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

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  returnHome() {
    this.navCtrl.popToRoot();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SignupPage');
  }
}
