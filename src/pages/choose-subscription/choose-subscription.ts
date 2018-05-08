import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Subscription } from '../order-tag/order-tag';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { InAppPurchase } from '@ionic-native/in-app-purchase';

@IonicPage()
@Component({
  selector: 'page-choose-subscription',
  templateUrl: 'choose-subscription.html'
})
export class ChooseSubscriptionPage {
  private subscriptionOptions: String;
  private subscription: Subscription;
  private products;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private utils: UtilsProvider,
    private afs: AngularFirestore,
    private iap: InAppPurchase
  ) {
    this.iap
      .getProducts([
        'com.gethuan.huanapp.monthly_subscription',
        'com.gethuan.huanapp.yearly_subscription'
      ])
      .then(products => {
        console.log(JSON.stringify(products));
        this.products = products;
      })
      .catch(error => {
        console.error(JSON.stringify(error));
      });

    this.subscription = this.navParams.data;
    this.subscriptionOptions = this.subscription.subscription_type;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ChooseSubscriptionPage');
  }

  confirmSubscription() {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef
        .update({ subscription: this.subscription })
        .then(data => {
          console.log(
            'confirmSubscription: Updated subscription info for user ' + uid
          );

          this.navCtrl.push('ConfirmSubscriptionPage');
        })
        .catch(error => {
          console.error(
            'confirmSubscription: Unable to update Firestore: ' +
              JSON.stringify(error)
          );
        });
    });
  }
}
