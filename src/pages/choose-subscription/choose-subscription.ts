import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Subscription } from '../order-tag/order-tag';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { ConfirmSubscriptionPage } from '../confirm-subscription/confirm-subscription';

@IonicPage()
@Component({
  selector: 'page-choose-subscription',
  templateUrl: 'choose-subscription.html',
})
export class ChooseSubscriptionPage {
  private subscriptionOptions: String;
  private subscription: Subscription;

  constructor(public navCtrl: NavController, 
    public navParams: NavParams,
    private utils: UtilsProvider,
    private afs: AngularFirestore) {
      this.subscription = this.navParams.data;
      this.subscriptionOptions = this.subscription.subscription_type;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ChooseSubscriptionPage');
  }

  confirmSubscription() {
    this.utils.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);
      setRef.update({ subscription: this.subscription }).then ((data) => {
        console.log("confirmSubscription: Updated subscription info for user " + uid);

        this.navCtrl.push(ConfirmSubscriptionPage);
      }).catch(error => {
        console.error("confirmSubscription: Unable to update Firestore: " + JSON.stringify(error));
      })
    })
  }
}
