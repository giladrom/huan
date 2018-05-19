import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController
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

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private authProvider: AuthProvider,
    private alertController: AlertController,
    private utilsProvider: UtilsProvider
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
    var loader = this.utilsProvider.presentLoading(30000);

    this.authProvider.loginEmail(this.email, this.password).then(
      authData => {
        loader.dismiss();

        console.log('loginUserWithEmail: Success');
      },
      error => {
        loader.dismiss();

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

  returnHome() {
    this.navCtrl.popToRoot();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EmailLoginPage');
  }
}
