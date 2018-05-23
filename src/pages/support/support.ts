import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';

/**
 * Generated class for the SupportPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-support',
  templateUrl: 'support.html'
})
export class SupportPage {
  public supportForm: FormGroup;

  private email;
  private supportText;

  private showSupportPage: any = true;
  private showConfirmationPage: any = false;

  private supportIssue = 'General Question';
  private supportSelectOptions = {
    title: 'Topic'
  };

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public formBuilder: FormBuilder
  ) {
    this.supportForm = formBuilder.group({
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
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SupportPage');
  }

  submit() {
    this.showSupportPage = false;
    this.showConfirmationPage = true;
  }
}
