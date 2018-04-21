import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TagOrder } from '../order-tag/order-tag';
import { UtilsProvider } from '../../providers/utils/utils';

/**
 * Generated class for the ChooseSubscriptionPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-choose-subscription',
  templateUrl: 'choose-subscription.html',
})
export class ChooseSubscriptionPage {
  private subscriptionOptions: String;
  private order: TagOrder;

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private utils: UtilsProvider) {

      this.order = this.navParams.data;
      this.subscriptionOptions = "yearly";
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ChooseSubscriptionPage');
  }

  confirmSubscription() {
    // Do subscription and billing stuff here
  }
}
