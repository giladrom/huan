import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UtilsProvider } from '../../providers/utils/utils';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthProvider } from '../../providers/auth/auth';
import { Mixpanel } from '@ionic-native/mixpanel';

@IonicPage()
@Component({
  selector: 'page-support',
  templateUrl: 'support.html'
})
export class SupportPage {
  public supportForm: FormGroup;

  private name;
  private email;
  private supportText;

  private showSupportPage: any = true;
  private showConfirmationPage: any = false;

  private supportIssue = 'General Question';
  private supportSelectOptions = {
    title: 'Topic'
  };

  private httpHeaders = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider,
    private platform: Platform,
    public http: HttpClient,
    private mixpanel: Mixpanel
  ) {
    this.supportForm = formBuilder.group({
      email: [
        '',
        Validators.compose([
          Validators.email,
          Validators.required,
          Validators.maxLength(100)
        ])
      ],
      issue: ['', Validators.compose([Validators.required])],
      supportText: [
        '',
        Validators.compose([
          Validators.minLength(2),
          Validators.maxLength(1000),
          Validators.required
        ])
      ]
    });

    this.authProvider.getUserInfo().then(user => {
      this.name = user.displayName;
      // this.email = user.email;
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SupportPage');
  }

  ionViewWillLeave() {}

  submit() {
    this.mixpanel.track('submit_support_request').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.showSupportPage = false;
    this.showConfirmationPage = true;

    this.utilsProvider
      .createSupportTicket(
        this.name,
        this.email,
        this.supportIssue,
        this.supportText
      )
      .then(data => {
        console.log('Created new ticket: ' + JSON.stringify(data));
      })
      .catch(error => {
        console.error('Error creating ticket: ' + error);
      });
  }

  openFacebook() {
    window.open('https://facebook.com/gethuan/', '_system');
  }

  openInstagram() {
    window.open('https://instagram.com/gethuan/', '_system');
  }

}
