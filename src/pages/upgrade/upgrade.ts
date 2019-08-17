import { Component } from '@angular/core';
import { IonicPage, ViewController, Platform } from 'ionic-angular';
import { Observable, of } from 'rxjs';
import { StoreSubscription } from '../../pages/order-tag/order-tag';
import { AuthProvider } from '../../providers/auth/auth';
import { Mixpanel } from '@ionic-native/mixpanel';

declare var Purchases: any;

@IonicPage()
@Component({
  selector: 'page-upgrade',
  templateUrl: 'upgrade.html'
})
export class UpgradePage {
  private subscriptionOptions: String;
  private subscription: StoreSubscription = {};

  private products: Observable<any[]>;
  private has_existing_subscription: boolean = false;
  private total_tags_added: number = 0;

  constructor(
    public viewCtrl: ViewController,
    private platform: Platform,
    private authProvider: AuthProvider,
    private mixpanel: Mixpanel
  ) {
    Purchases.getEntitlements(
      entitlements => {
        this.products = of([
          entitlements.Premium.premium,
          entitlements.Premium.unlimited
        ]);
      },
      error => {
        console.error('getEntitlements', JSON.stringify(error));
      }
    );

    Purchases.getPurchaserInfo(
      info => {
        console.log('getPurchaserInfo', JSON.stringify(info));

        try {
          const subscribed =
            info.activeSubscriptions !== 'undefined' &&
            info.activeEntitlements.length > 0;

          console.log('subscribed', subscribed);

          if (!subscribed) {
            this.has_existing_subscription = false;
          } else {
            this.has_existing_subscription = true;
          }
        } catch (e) {
          console.error(JSON.stringify(e));
        }
      },
      error => {
        // Error fetching purchaser info
        console.error(JSON.stringify(error));
      }
    );

    this.authProvider
      .getSubscriptionInfo()
      .then(subscription => {
        console.log('getSubscriptionInfo', JSON.stringify(subscription));

        if (!subscription.subscription_type) {
          if (this.platform.is('android')) {
            this.subscription.subscription_type =
              'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99';
          } else {
            this.subscription.subscription_type =
              'com.gethuan.huanapp.community_protection_15_mile_monthly';
          }
        } else {
          this.subscription = subscription;
        }

        this.subscriptionOptions = this.subscription.subscription_type;
      })
      .catch(e => {
        console.error('getSubscriptionInfo', JSON.stringify(e));
        if (this.platform.is('android')) {
          this.subscription.subscription_type =
            'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99';
        } else {
          this.subscription.subscription_type =
            'com.gethuan.huanapp.community_protection_15_mile_monthly';
        }
      });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad UpgradePage');
  }

  selectSubscription(subscription) {
    console.log(subscription);

    this.mixpanel
      .track('select_subscription', { subscription: subscription })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.subscription.subscription_type = subscription;
  }

  checkTagLimit(subscription) {
    if (
      subscription === 'com.gethuan.huanapp.basic_protection' &&
      this.total_tags_added > 1
    ) {
      return true;
    }

    if (
      subscription ===
        'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99' &&
      this.total_tags_added > 3
    ) {
      return true;
    }

    if (
      subscription ===
        'com.gethuan.huanapp.community_protection_15_mile_monthly' &&
      this.total_tags_added > 3
    ) {
      return true;
    }

    if (
      subscription ===
        'com.gethuan.huanapp.community_protection_unlimited_monthly' &&
      this.total_tags_added > 5
    ) {
      return true;
    }
  }
  dismiss() {
    this.viewCtrl.dismiss().then(() => {
      console.log('Dismissed');
    });
  }
}
