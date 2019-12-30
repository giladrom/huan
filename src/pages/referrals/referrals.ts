import { Component } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController
} from "ionic-angular";

import { AngularFirestore } from "@angular/fire/firestore";
import { SocialSharing } from "@ionic-native/social-sharing";
import { Mixpanel } from "@ionic-native/mixpanel";

@IonicPage()
@Component({
  selector: "page-referrals",
  templateUrl: "referrals.html"
})
export class ReferralsPage {
  private coupon: String = "Loading...";
  private count: any = 0;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private afs: AngularFirestore,
    private socialSharing: SocialSharing,
    private mixpanel: Mixpanel
  ) {}

  ionViewDidLoad() {
    this.generateCoupon();
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("referrals_page")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });
  }

  generateCoupon() {
    console.log("generateCoupon()");

    var generateCode = this.afs.firestore.app
      .functions()
      .httpsCallable("generateReferralCode");

    var getReferralCount = this.afs.firestore.app
      .functions()
      .httpsCallable("getReferralCount");

    generateCode({ data: "data" })
      .then(r => {
        console.log("generateCoupon succeeded");
        var sanitizedMessage = r.data.message;
        console.log("generateCoupon returned", JSON.stringify(r.data));

        this.coupon = sanitizedMessage;

        getReferralCount({ coupon: this.coupon })
          .then(count => {
            const referral_count = count.data.message[0].usage_count;

            if (referral_count > 0) {
              var int = setInterval(() => {
                if (this.count >= referral_count) {
                  clearInterval(int);
                } else {
                  this.count++;
                }
              }, 30);
            } else {
              this.count = 0;
            }
            console.log("count", this.count);
          })
          .catch(e => {
            console.error(e);
          });
      })
      .catch(e => {
        console.error(e);
      });
  }

  share() {
    this.mixpanel
      .track("share_referral_code")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.socialSharing
      .shareWithOptions({
        message: `Hey! To get a 5% lifetime discount, join Huan and use my code ${this.coupon} (I'll get credit, too). It's the best way to keep your pets safe!\rHere's the website link:`,
        subject: "Get a 5% lifetime discount",
        url: "https://gethuan.com/",
        chooserTitle: "Share Huan"
      })
      .then(() => {
        console.log("Share Successful");
      })
      .catch(e => {
        console.error(e);
      });
  }
  dismiss() {
    this.viewCtrl.dismiss().then(() => {
      console.log("Dismissed");
    });
  }
}
