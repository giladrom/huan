import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { StoreSubscription } from '../order-tag/order-tag';
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
  private subscription: StoreSubscription;
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
    console.log('Received purchase confirmation');

    this.iap
      .subscribe(this.subscription.subscription_type.toString())
      .then(data => {
        console.log('Purchase data: ' + JSON.stringify(data));

        this.subscription.transaction_data = data;

        this.utils.getUserId().then(uid => {
          var setRef = this.afs.collection('Users').doc(uid);
          setRef
            .update({ subscription: this.subscription })
            .then(data => {
              console.log(
                'confirmSubscription: Updated subscription info for user ' + uid
              );

              this.utils
                .createSupportTicket(
                  this.subscription.name,
                  this.subscription.email,
                  'New Subscription',
                  this.utils.subscriptionToString(this.subscription)
                )
                .then(data => {
                  console.log('Created new ticket: ' + data);
                })
                .catch(error => {
                  console.error('Error creating ticket: ' + error);
                });

              this.navCtrl.push('ConfirmSubscriptionPage');
            })
            .catch(error => {
              console.error(
                'confirmSubscription: Unable to update Firestore: ' +
                  JSON.stringify(error)
              );
            });
        });
      })
      .catch(error => {
        console.error(
          'Unable to complete transaction: ' + JSON.stringify(error)
        );
        this.utils.displayAlert(
          'Unable to complete transaction',
          error.errorMessage
        );
      });
  }
}
