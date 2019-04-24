import { Component, ViewChild, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';
import { StoreSubscription } from '../order-tag/order-tag';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { InAppPurchase } from '@ionic-native/in-app-purchase';
import { AuthProvider } from '../../providers/auth/auth';
import { Slides } from 'ionic-angular';
import { Tag, TagProvider } from '../../providers/tag/tag';
import { map, retry, takeUntil, catchError, first } from 'rxjs/operators';
import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import moment from 'moment';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { Mixpanel } from '@ionic-native/mixpanel';

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

@IonicPage()
@Component({
  selector: 'page-choose-subscription',
  templateUrl: 'choose-subscription.html'
})
export class ChooseSubscriptionPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private subscriptionOptions: String;
  private subscription: StoreSubscription = {};
  private products;
  private enhanced_protection = true;
  private selected_color = Array<any>();
  private selected_type = Array<any>();

  private tags$: Observable<Tag[]>;
  private tags: Array<Tag>;
  private orderForm: FormGroup;
  private loader;
  private line_items = [];
  

  @ViewChild(Slides) slides: Slides;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private utils: UtilsProvider,
    private authProvider: AuthProvider,
    private afs: AngularFirestore,
    private iap: InAppPurchase,
    private formBuilder: FormBuilder,
    private tagProvider: TagProvider,
    private nativeGeocoder: NativeGeocoder,
    private loadingCtrl: LoadingController,
    private mixpanel: Mixpanel,

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
      coupon: ['', [
        Validators.minLength(4),
        Validators.maxLength(5),
        Validators.pattern('^[a-zA-Z\\s*]+$')
      ]
      ]
    });
    this.iap
      .getProducts([
        // 'com.gethuan.huanapp.community_protection_5_mile_monthly',
        'com.gethuan.huanapp.community_protection_15_mile_monthly',
        'com.gethuan.huanapp.community_protection_unlimited_monthly'
      ])
      .then(products => {
        console.log(JSON.stringify(products));
        this.products = products.sort((a, b) => a.priceAsDecimal > b.priceAsDecimal);;
      })
      .catch(error => {
        console.error(JSON.stringify(error));
      });

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

    this.authProvider.getSubscriptionInfo().then(subscription => {
      if (!subscription.subscription_type) {
        this.subscription.subscription_type = 'com.gethuan.huanapp.community_protection_15_mile_monthly'; 
      } else {
        this.subscription = subscription;
      }
      
      this.subscriptionOptions = this.subscription.subscription_type;
  
    }).catch(e => {
      console.error(e);
    });


    this.authProvider.getUserId().then(uid => {
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
          })
        });

        console.log('line items', JSON.stringify(this.line_items));
      });
    });

  }

  ionViewDidLoad() {
    this.mixpanel
    .track('choose_subscription')
    .then(() => { })
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
    this.slides.lockSwipes(false);
    this.slides.slideNext();
    this.slides.lockSwipeToNext(true);
  }

  prevSlide() {
    this.slides.lockSwipes(false);
    this.slides.slidePrev();
    this.slides.lockSwipeToNext(true);
  }

  selectColor(tag, color) {
    this.mixpanel
    .track('select_color', { color: color })
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });

    if (this.subscription.subscription_type === 'com.gethuan.huanapp.basic_protection') {
      if (color === 'yellow' || color === 'coral') {
        this.tagProvider.updateTagColor(tag, color);
      }
    } else {
      this.tagProvider.updateTagColor(tag, color);
    }
  }

  selectType(tag, type) {
    this.mixpanel
    .track('select_type', { type: type })
    .then(() => { })
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
      case 'com.gethuan.huanapp.community_protection_unlimited_monthly':
        ret = 'Unlimited';
        break;
    }

    return ret;
  }

  selectSubscription(subscription) {
    this.mixpanel
    .track('select_subscription', { subscription: subscription })
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });

    this.subscription.subscription_type = subscription;

    if (subscription === 'com.gethuan.huanapp.basic_protection') {

      this.tags.forEach(tag => {
        this.tagProvider.updateTagColor(tag, 'yellow');
      });
    }
  }

  changeSubscription(event) {
    console.log(JSON.stringify(event));
    if (event == 'com.gethuan.huanapp.basic_protection') {

      const unsub = this.tags$.subscribe(tags => {
        unsub.unsubscribe();

        tags.forEach(tag => {
          this.tagProvider.updateTagColor(tag, 'yellow');
        })
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
    this.mixpanel
    .track('confirm_subscription')
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });

    console.log('Received purchase confirmation');

    if (this.subscription.subscription_type != 'com.gethuan.huanapp.basic_protection') {
      this.iap
        .subscribe(this.subscription.subscription_type.toString())
        .then(data => {
          console.log('Purchase data: ' + JSON.stringify(data));

          this.subscription.transaction_data = data;

          this.gotoConfirmSubscription(moment().format('HHmmSS'));
        })
        .catch(error => {
          this.mixpanel
          .track('subscription_error')
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

          
          console.error(
            'Unable to complete transaction: ' + JSON.stringify(error)
          );
          this.utils.displayAlert(
            'Unable to complete transaction',
            error.errorMessage
          );
        });
    } else {
      this.gotoConfirmSubscription(moment().format('HHmmSS'));
    }
  }

  gotoConfirmSubscription(order_id) {
    this.showLoading();

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

          shippo.address.create(validate, function (err, address) {
            if (err) {
              console.error('address', err);
            } else {
              console.log('validate', JSON.stringify(address));

              if (!address.validation_results.is_valid) {
                console.error('Address invalid');
                self.dismissLoading();

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
                      .createShippoOrder(address, addressFrom, self.line_items, order_id)
                      .then(r => {
                        console.log('createShippoOrder', JSON.stringify(r));

                        self
                          .updateUnattachedTagsOrder(order_id)
                          .then(r => {
                            console.log('Updated tags with order id');

                            self.dismissLoading();
                            // self.navCtrl.push('ConfirmSubscriptionPage');
                            self.utils.displayAlert('CONGRATULATIONS!', 
                            'Thank you for joining the Huan community! We will send you a notification e-mail when your tags are ready to ship.',
                            self.navCtrl.popToRoot());
                          })
                          .catch(e => {
                            self.dismissLoading();

                            console.error(
                              'Unable to update tags with order id'
                            );
                          });
                      }).catch(e => {
                        console.error('createShippoOrder', JSON.stringify(e));
                      });
                  })
                  .catch(e => {
                    self.dismissLoading();

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

          console.error(
            'confirmSubscription: Unable to update Firestore: ' +
            JSON.stringify(error)
          );
        });
    });
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
