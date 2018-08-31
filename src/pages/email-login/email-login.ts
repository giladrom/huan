import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController,
  LoadingController
} from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthProvider } from '../../providers/auth/auth';
import { UtilsProvider } from '../../providers/utils/utils';

@IonicPage()
@Component({
  selector: 'page-email-login',
  templateUrl: 'email-login.html'
})
export class EmailLoginPage {
  private emailForm: FormGroup;
  private email: any;
  private password: any;

  private loader;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private authProvider: AuthProvider,
    private alertController: AlertController,
    private utilsProvider: UtilsProvider,
    private loadingCtrl: LoadingController
  ) {
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(32)
          //Validators.pattern('^[.*]+$'),
        ]
      ]
    });
  }

  loginUserWithEmail() {
    this.showLoading();

    this.authProvider.loginEmail(this.email, this.password).then(
      authData => {
        this.dismissLoading();

        console.log('loginUserWithEmail: Success');
      },
      error => {
        this.dismissLoading();

        this.utilsProvider.displayAlert(
          'Login Error',
          'Invalid E-Mail or Password. Please try again.'
        );
        console.error('loginUserWithEmail: Unable to login: ' + error);
      }
    );
  }

  newUserSignUp() {
    this.navCtrl.push('SignupPage');
  }

  resetPassword() {
    if (this.emailForm.get('email').valid) {
      this.showLoading();

      this.authProvider
        .resetPassword(this.email)
        .then(() => {
          this.dismissLoading();

          this.utilsProvider.displayAlert(
            'Password Reset',
            'A password reset link has been sent to ' + this.email
          );
        })
        .catch(e => {
          console.error('resetPassword(): ' + e);
          this.dismissLoading();

          this.utilsProvider.displayAlert(
            'Password Reset',
            'Unable to send reset email: ' + e
          );
        });
    }
  }

  returnHome() {
    this.navCtrl.popToRoot();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EmailLoginPage');
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
}
