import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController
} from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AuthProvider } from '../../providers/auth/auth';
// import { SignupPage } from '../signup/signup';

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
    private alertController: AlertController
  ) {
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(20)
          //Validators.pattern('^[.*]+$'),
        ]
      ]
    });
  }

  loginUserWithEmail() {
    this.authProvider.loginEmail(this.email, this.password).then(
      authData => {
        console.log('loginUserWithEmail: Success');
      },
      error => {
        this.showLoginError('Invalid E-Mail or Password. Please try again.');
        console.error('loginUserWithEmail: Unable to login: ' + error);
      }
    );
  }

  newUserSignUp() {
    this.navCtrl.push('SignupPage');
  }

  showLoginError(error) {
    let confirm = this.alertController.create({
      title: 'Login Error',
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

  returnHome() {
    this.navCtrl.popToRoot();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EmailLoginPage');
  }
}
