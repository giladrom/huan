import { Component } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController,
} from "ionic-angular";

import { AngularFirestore } from "@angular/fire/firestore";
import { SocialSharing } from "@ionic-native/social-sharing";
import { Mixpanel } from "@ionic-native/mixpanel";
import { UtilsProvider } from "../../providers/utils/utils";
import { InAppBrowser } from "@ionic-native/in-app-browser";
import { AuthProvider } from "../../providers/auth/auth";
import { NotificationProvider } from "../../providers/notification/notification";
import { ReplaySubject } from "rxjs";

import * as firebase from "firebase/app";
import "firebase/firestore";
import { ConditionalExpr } from "@angular/compiler";

@IonicPage()
@Component({
  selector: "page-referrals",
  templateUrl: "referrals.html",
})
export class ReferralsPage {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private coupon: String = "Loading...";
  private coupon_ready = false;
  private count: any = 0;
  private invite_count = 0;
  private bucket = "referral";
  private score = 0;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private afs: AngularFirestore,
    // private socialSharing: SocialSharing,
    private mixpanel: Mixpanel,
    private utilsProvider: UtilsProvider,
    private iab: InAppBrowser,
    private authProvider: AuthProvider,
    private notificationProvider: NotificationProvider
  ) {

    this.authProvider.getUserId().then(uid => {
      this.afs
        .collection("Users")
        .doc(uid)
        .valueChanges()
        .takeUntil(this.destroyed$)
        .subscribe(user => {
          var userInfo: any = user;

          try {
            this.invite_count = userInfo.account.coupons.invites;
          } catch (e) {
            this.invite_count = 0;
          }
        })
    })

    // this.utilsProvider
    //   .getCurrentScore("invite")
    //   .then((s) => {
    //     // this.invite_count = 0;

    //     // XXX
    //     // MAKE SURE THIS IS ENABLED IN PRODUCTION
    //     this.invite_count = <any>s;
    //     // XXX
    //   })
    //   .catch((e) => {
    //     console.error(e);
    //   });

    // this.utilsProvider
    //   .getCurrentScore(this.bucket)
    //   .then((s) => {
    //     this.score = <any>s;
    //   })
    //   .catch((e) => {
    //     console.error(e);
    //   });

    // setInterval(() => {
    //   this.utilsProvider
    //     .getCurrentScore(this.bucket)
    //     .then((s) => {
    //       this.score = <any>s;
    //     })
    //     .catch((e) => {
    //       console.error(e);
    //     });

    //   this.utilsProvider
    //     .getCurrentScore("invite")
    //     .then((s) => {
    //       this.invite_count = <any>s;
    //     })
    //     .catch((e) => {
    //       console.error(e);
    //     });
    // }, 5000);
  }

  ionViewDidLoad() {
    this.generateCoupon();
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("referrals_page")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });
  }

  generateCoupon() {
    console.log("generateCoupon()");

    var generateCode = this.afs.firestore.app
      .functions()
      .httpsCallable("generateFreeTagCouponCode");

    // var getReferralCount = this.afs.firestore.app
    //   .functions()
    //   .httpsCallable("getReferralCount");

    generateCode({ data: "data" })
      .then((r) => {
        console.log("generateCoupon succeeded");
        var sanitizedMessage = r.data.message;
        console.log("generateCoupon returned", JSON.stringify(r.data));

        this.coupon = sanitizedMessage;
        this.coupon_ready = true;

        // getReferralCount({ coupon: this.coupon })
        //   .then((count) => {
        //     const referral_count = count.data.message[0].usage_count;

        //     if (referral_count > 0) {
        //       var int = setInterval(() => {
        //         if (this.count >= referral_count) {
        //           clearInterval(int);
        //         } else {
        //           this.count++;
        //         }
        //       }, 30);
        //     } else {
        //       this.count = 0;
        //     }
        //     console.log("count", this.count);
        //   })
        //   .catch((e) => {
        //     console.error(e);
        //   });
      })
      .catch((e) => {
        console.error(e);
      });
  }

  invite() {
    this.authProvider
      .getAccountInfo(false)
      .then(account => {
        this.utilsProvider
          .textReferralCode(
            account.displayName,
            account.team ? account.team : "",
            this.notificationProvider.getFCMToken()
          )
          .then(r => {
            console.log("invite", r);
            this.authProvider.getUserId().then(uid => {
              this.afs
                .collection("Users")
                .doc(uid)
                .update({
                  'account.coupons.invites': firebase.firestore.FieldValue.increment(+1)
                }).then(r => {
                  console.log("Incrementing invite count");
                }).catch(e => {
                  console.error("Unable to increment invite count", e);
                })
            })
          })
          .catch(e => {
            console.warn("invite", e);
          });
      })
      .catch(e => {
        console.error("invite(): ERROR: Unable to get account info!", e);
      });
  }

  dismiss() {
    this.viewCtrl.dismiss().then(() => {
      console.log("Dismissed");
    });
  }

  redeem() {
    this.iab.create("https://www.gethuan.com/coupons/" + this.coupon, "_system");
  }

  shop() {
    this.iab.create("https://www.gethuan.com/huan-shop/", "_system");
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

}
