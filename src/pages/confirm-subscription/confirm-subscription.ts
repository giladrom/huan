import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-confirm-subscription',
  templateUrl: 'confirm-subscription.html'
})
export class ConfirmSubscriptionPage {
  constructor(public navCtrl: NavController, public navParams: NavParams) {}

  ionViewDidLoad() {
    console.log('ionViewDidLoad ConfirmSubscriptionPage');
  }

  goHome() {
    this.navCtrl.popToRoot();
  }
}
