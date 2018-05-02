import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  Loading,
  LoadingController,
  AlertController
} from 'ionic-angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthProvider } from '../../providers/auth/auth';
import { EmailValidator } from '../../validators/email';
import { HomePage } from '../home/home';
import { PasswordValidator } from '../../validators/password.validator';

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

  constructor(
    public navCtrl: NavController,
    public authProvider: AuthProvider,
    public formBuilder: FormBuilder,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController
  ) {
    this.signupForm = formBuilder.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      passwords: formBuilder.group(
        {
          password: [
            '',
            Validators.compose([
              Validators.minLength(8),
              Validators.maxLength(20),
              Validators.required
            ])
          ],
          passwordVerify: [
            '',
            Validators.compose([
              Validators.minLength(8),
              Validators.maxLength(20),
              Validators.required
            ])
          ]
        },
        { validator: PasswordValidator }
      )
    });

    var rando = this.randomIntFromInterval(5000, 7000);
    // XXX TESTING ONLY
    this.email = `gilad.rom+huan${rando}@gmail.com`;
    this.password = '12345678';
    this.passwordVerify = '12345678';
    // XXX TESTING ONLY
  }

  signupUser() {
    this.authProvider.signupUser(this.email, this.password).catch(error => {
      console.error('signupUser: ' + error);
    });
  }

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SignupPage');
  }
}
