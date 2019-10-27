import { Component, ViewChild, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  LoadingController,
  List,
  Platform
} from 'ionic-angular';
import { StoreSubscription } from '../order-tag/order-tag';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthProvider } from '../../providers/auth/auth';
import { Slides } from 'ionic-angular';
import { Tag, TagProvider } from '../../providers/tag/tag';
import { map, retry, takeUntil, catchError, first } from 'rxjs/operators';
import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject,
  from,
  of,
  BehaviorSubject
} from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import moment from 'moment';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { Mixpanel } from '@ionic-native/mixpanel';
import { Pro } from '@ionic/pro';
const uuidv1 = require('uuid/v1');
import firebase from 'firebase';
import 'rxjs/add/observable/from';
import * as Sentry from 'sentry-cordova';

var shippo = require('shippo')(
  'shippo_live_984e8c408cb8673dc9e1532e251f5ff12ca8ce60'
);

// Shippo configuration objects
var addressFrom = {
  name: 'Valinor LLC',
  street1: '638 Lindero Canyon Rd STE 118',
  city: 'Oak Park',
  state: 'CA',
  zip: '91377',
  country: 'US'
};

declare var Purchases: any;

@IonicPage()
@Component({
  selector: 'page-choose-subscription',
  templateUrl: 'choose-subscription.html'
})
export class ChooseSubscriptionPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private subscriptionOptions: String;
  private subscription: StoreSubscription = {};
  private _products: BehaviorSubject<any[]> = new BehaviorSubject([]);
  private products: Observable<any[]>;

  private enhanced_protection = true;
  private selected_color = Array<any>();
  private selected_type = Array<any>();

  private tags$: Observable<Tag[]>;
  private tags: Array<Tag> = [];
  private total_tags_added: number = 0;
  private tagTypes$: Observable<any[]>;
  private orderForm: FormGroup;
  private loader;
  private line_items = [];
  private has_existing_subscription: boolean = false;

  @ViewChild(Slides) slides: Slides;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private utils: UtilsProvider,
    private authProvider: AuthProvider,
    private afs: AngularFirestore,
    private formBuilder: FormBuilder,
    private tagProvider: TagProvider,
    private nativeGeocoder: NativeGeocoder,
    private loadingCtrl: LoadingController,
    private mixpanel: Mixpanel,
    private platform: Platform
  ) {
    this.orderForm = this.formBuilder.group({
      name: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30)
          // Validators.pattern('^[a-zA-Z\\s*]+$')
        ])
      ],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      address1: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(200)
        ])
      ],
      address2: ['', Validators.maxLength(200)],
      city: [
        '',
        [
          Validators.required,
          Validators.maxLength(30)
          // Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      state: [
        '',
        [
          Validators.required,
          Validators.maxLength(30),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      zipcode: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(10),
          Validators.pattern('^[0-9\\s*]+$')
        ])
      ],
      coupon: [
        '',
        [
          Validators.minLength(4),
          Validators.maxLength(5),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ]
    });

    // this.showLoading();

    try {
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
    } catch (e) {
      console.error('getEntitlements', JSON.stringify(e));
    }

    Purchases.getPurchaserInfo(
      info => {
        console.log('getPurchaserInfo', JSON.stringify(info));

        try {
          const subscribed =
            info.activeSubscriptions !== 'undefined' &&
            info.activeEntitlements.length > 0;
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
        console.error('Error fetching purchaser info', JSON.stringify(error));
      }
    );

    // XXX FOR TESTING PURPOSES ONLY
    // this.subscription = {
    //   name: 'Test Name',
    //   email: 'gilad@gethuan.com',
    //   address1: '5605 Foxwood Dr Apt F',
    //   address2: '5678 Dr',
    //   city: 'Oak Park',
    //   state: 'CA',
    //   zipcode: '91377',
    //   amount: 1,
    //   subscription_type: 'com.gethuan.huanapp.yearly_subscription',
    //   start_date: moment().format()
    // };
    // XXX FOR TESTING PURPOSES ONLY

    this.subscription.start_date = moment().format();

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

    this.authProvider.getUserId().then(uid => {
      this.afs
        .collection<Tag>('Tags', ref => ref.where('uid', 'array-contains', uid))
        .snapshotChanges()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(tags => {
          this.total_tags_added = tags.length;
        });

      this.tags$ = this.afs
        .collection<Tag>('Tags', ref =>
          ref
            .where('uid', 'array-contains', uid)
            .where('tagattached', '==', false)
            .where('order_status', '==', 'none')
        )
        .snapshotChanges()
        .pipe(
          catchError(e => observableThrowError(e)),
          retry(2),
          takeUntil(this.destroyed$),
          // first(),
          map(actions =>
            actions.map(a => {
              const data = a.payload.doc.data() as any;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        );

      this.tags$.subscribe(tags => {
        this.tags = tags;

        this.line_items = [];

        tags.forEach(t => {
          this.line_items.push({
            title: 'Huan Tag',
            variant_title: `${t.tag_color} ${t.tag_type}`,
            quantity: 1,
            currency: 'USD',
            weight: '0.10',
            weight_unit: 'lb'
          });
        });

        console.log('line items', JSON.stringify(this.line_items));
      });
    });

    this.tagTypes$ = this.afs
      .collection('tagTypes', ref => ref.orderBy('subscription', 'asc'))
      .valueChanges()
      .takeUntil(this.destroyed$);

    this.tagTypes$.subscribe(tagTypes => {
      tagTypes.forEach(tagType => {
        console.log('tagType', tagType);
      });
    });
  }

  ionViewDidLoad() {
    this.mixpanel
      .track('choose_subscription')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    console.log('ionViewDidLoad ChooseSubscriptionPage');
    this.slides.lockSwipeToNext(true);
  }

  trackByTags(index: number, tag: Tag) {
    return tag.tagId;
  }

  nextSlide() {
    this.mixpanel
      .track('next_slide')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slideNext();
    this.slides.lockSwipeToNext(true);
  }

  prevSlide() {
    this.mixpanel
      .track('previous_slide')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.slides.lockSwipes(false);
    this.slides.slidePrev();
    this.slides.lockSwipeToNext(true);
  }

  selectColor(tag, tag_type, subscription_type) {
    this.mixpanel
      .track('select_color', { color: tag_type.name })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    console.log('selectColor', tag_type.name);

    if (
      this.availableForSelectedSubscriptionType(tag_type, subscription_type) &&
      tag_type.available
    ) {
      this.tagProvider.updateTagColor(tag, tag_type.name);
    }

    // if (
    //   this.subscription.subscription_type ===
    //   'com.gethuan.huanapp.basic_protection'
    // ) {
    //   if (color === 'orange' || color === 'coral') {
    //     this.tagProvider.updateTagColor(tag, color);
    //   }
    // } else {
    //   this.tagProvider.updateTagColor(tag, color);
    // }
  }

  getSelectorBackgroundColor(colors) {
    if (colors.length > 1) {
      var css = 'linear-gradient(to right';
      colors.forEach(color => {
        css += ',' + color;
      });
      css += ')';

      return css;
    } else {
      return colors[0];
    }
  }

  getSubscriptionLevelForTag(tag_type) {
    if (
      tag_type.subscription.includes(
        'com.gethuan.huanapp.community_protection_15_mile_monthly'
      )
    ) {
      return 'Premium';
    }

    if (
      tag_type.subscription.includes(
        'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99'
      )
    ) {
      return 'Premium';
    }

    if (
      tag_type.subscription.includes(
        'com.gethuan.huanapp.community_protection_unlimited_monthly'
      )
    ) {
      return 'Unlimited';
    }

    if (
      tag_type.subscription.includes('com.gethuan.huanapp.basic_protection')
    ) {
      return 'Basic';
    }
  }

  availableForSelectedSubscriptionType(tag_type, subscription_type) {
    return tag_type.subscription.includes(subscription_type);
  }

  selectType(tag, type) {
    this.mixpanel
      .track('select_type', { type: type })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.tagProvider.updateTagType(tag, type);
  }

  getSubscriptionTitle() {
    var ret;

    switch (this.subscription.subscription_type) {
      case 'com.gethuan.huanapp.basic_protection':
        ret = 'Basic';
        break;
      case 'com.gethuan.huanapp.community_protection_15_mile_monthly':
        ret = 'Premium';
        break;
      case 'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99':
        ret = 'Premium';
        break;

      case 'com.gethuan.huanapp.community_protection_unlimited_monthly':
        ret = 'Unlimited';
        break;
    }

    return ret;
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

  selectSubscription(subscription) {
    this.mixpanel
      .track('select_subscription', { subscription: subscription })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.subscription.subscription_type = subscription;

    if (subscription === 'com.gethuan.huanapp.basic_protection') {
      this.tags.forEach(tag => {
        this.tagProvider.updateTagColor(tag, 'Orange');
      });
    }
  }

  changeSubscription(event) {
    console.log(JSON.stringify(event));
    if (event == 'com.gethuan.huanapp.basic_protection') {
      const unsub = this.tags$.subscribe(tags => {
        unsub.unsubscribe();

        tags.forEach(tag => {
          this.tagProvider.updateTagColor(tag, 'Orange');
        });
      });
    }
  }

  updateUnattachedTagsOrder(order) {
    return new Promise((resolve, reject) => {
      this.authProvider.getUserId().then(uid => {
        const unsub = this.afs
          .collection<Tag>('Tags', ref =>
            ref
              .where('uid', 'array-contains', uid)
              .where('tagattached', '==', false)
              .where('order_status', '==', 'none')
          )
          .stateChanges()
          .pipe(
            catchError(e => observableThrowError(e)),
            retry(2),
            map(actions =>
              actions.map(a => {
                const data = a.payload.doc.data() as any;
                const id = a.payload.doc.id;
                return { id, ...data };
              })
            )
          )
          .subscribe(t => {
            unsub.unsubscribe();
            t.forEach(doc => {
              console.log(`Updating tag ${doc.id} with order number ${order}`);

              this.afs
                .collection<Tag>('Tags')
                .doc(doc.id)
                .update({
                  order_status: order
                })
                .then(() => {
                  console.log('Successfully updated');
                  resolve(true);
                })
                .catch(e => {
                  console.error('Unable to update', JSON.stringify(e));
                  reject(e);
                });
            });
          });
      });
    });
  }

  confirmSubscription() {
    this.showLoading();

    this.mixpanel
      .track('confirm_subscription')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    console.log(
      'Received purchase confirmation',
      this.has_existing_subscription
    );

    if (
      this.subscription.subscription_type !=
        'com.gethuan.huanapp.basic_protection' &&
      this.has_existing_subscription === false
    ) {
      // Account for Android price increases with new subscription name
      var subscription_name = this.subscription.subscription_type.toString();

      if (this.platform.is('android')) {
        if (
          subscription_name ==
          'com.gethuan.huanapp.community_protection_15_mile_monthly'
        ) {
          subscription_name =
            'com.gethuan.huanapp.community_protection_15_mile_monthly_2.99';
        }
      }

      this.mixpanel
        .track('new_subscription', {
          subscription: this.subscription.subscription_type
        })
        .then(() => {})
        .catch(e => {
          console.error('Mixpanel Error', e);
        });

      Purchases.makePurchase(
        subscription_name,
        ({ productIdentifier, purchaserInfo }) => {
          console.log('Purchase data: ' + JSON.stringify(purchaserInfo));

          Sentry.captureEvent({
            message: 'IAP Success' + this.subscription.subscription_type
          });

          if (purchaserInfo.activeEntitlements.includes('Premium')) {
            this.subscription.transaction_data = purchaserInfo;
            this.gotoConfirmSubscription(moment().format('HHmmSS'));
          }
        },
        ({ error, userCancelled }) => {
          this.dismissLoading();

          Sentry.captureEvent({ message: 'IAP Error' + error });

          this.mixpanel
            .track('subscription_error', { error: error.readable_error_code })
            .then(() => {})
            .catch(e => {
              console.error('Mixpanel Error', e);
            });

          console.error(
            'Unable to complete transaction: ' + JSON.stringify(error)
          );
          this.utils.displayAlert(
            'Unable to complete transaction',
            'Please contact Support'
          );
        }
      );
    } else {
      Sentry.captureEvent({
        message: 'New Tag Order' + this.subscription.subscription_type
      });

      this.gotoConfirmSubscription(moment().format('HHmmSS'));
    }
  }

  gotoConfirmSubscription(order_id) {
    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);

      setRef
        .update({ subscription: this.subscription })
        .then(data => {
          console.log(
            'confirmSubscription: Updated subscription info for user ' + uid
          );

          var addressTo = {
            name: this.subscription.name,
            street1: this.subscription.address1,
            city: this.subscription.city,
            state: this.subscription.state,
            zip: this.subscription.zipcode,
            country: 'US',
            email: this.subscription.email,
            metadata: 'UID ' + uid
          };

          var validate = addressTo;
          validate['validate'] = true;

          var self = this;

          shippo.address.create(validate, function(err, address) {
            if (err) {
              console.error('address', err);
            } else {
              console.log('validate', JSON.stringify(address));

              if (!address.validation_results.is_valid) {
                console.error('Address invalid');
                self.dismissLoading();

                Sentry.captureEvent({
                  message: 'Address Invalid' + address.validation_results
                });

                self.utils.displayAlert(
                  address.validation_results.messages[0].code,
                  address.validation_results.messages[0].text
                );
              } else {
                self.nativeGeocoder
                  .forwardGeocode(
                    `${address.street1} ${address.city} ${address.zip}`
                  )
                  .then(r => {
                    console.log('Resolved address', JSON.stringify(r));

                    self.utils
                      .createShippoOrder(
                        address,
                        addressFrom,
                        self.line_items,
                        order_id
                      )
                      .then(r => {
                        console.log('createShippoOrder', JSON.stringify(r));

                        const items = self.line_items;

                        self
                          .updateUnattachedTagsOrder(order_id)
                          .then(r => {
                            console.log('Updated tags with order id');

                            self.authProvider
                              .getAccountInfo(false)
                              .then(account => {
                                self.authProvider
                                  .getUserInfo()
                                  .then(user => {
                                    self.afs
                                      .collection('Orders')
                                      .doc(uuidv1())
                                      .set({
                                        order_id: order_id,
                                        order_items: items,
                                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                        uid: uid,
                                        name: account.displayName,
                                        email: user.providerData[0].email
                                      })
                                      .then(() => {})
                                      .catch(e => {
                                        console.error('Orders set', e);
                                      });
                                  })
                                  .catch(e => {
                                    console.error('getUserInfo', e);
                                  });
                              });

                            self.dismissLoading();
                            self.utils.displayAlert(
                              'CONGRATULATIONS!',
                              'Thank you for joining the Huan community! We will send you a notification e-mail when your tags are ready to ship.',
                              self.navCtrl.popToRoot()
                            );
                          })
                          .catch(e => {
                            self.dismissLoading();

                            console.error(
                              'Unable to update tags with order id'
                            );
                          });
                      })
                      .catch(e => {
                        self.dismissLoading();

                        console.error('createShippoOrder', JSON.stringify(e));
                      });
                  })
                  .catch(e => {
                    self.dismissLoading();

                    Sentry.captureEvent({ message: 'Address Invalid' + e });

                    self.utils.displayAlert(
                      'Invalid Address',
                      'Unable to validate address. Please check and try again.'
                    );

                    console.error('forwardGeocode', JSON.stringify(e));
                  });
              }
            }
          });
        })
        .catch(error => {
          this.dismissLoading();

          Sentry.captureEvent({ message: 'Firebase Error' + error });

          console.error(
            'confirmSubscription: Unable to update Firestore: ' +
              JSON.stringify(error)
          );
        });
    });
  }

  openPrivacyPolicy() {
    window.open('https://gethuan.com/privacy-policy/', '_system');
  }

  openTerms() {
    window.open('https://gethuan.com/terms-and-conditions/', '_system');
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: 'Please Wait...'
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
