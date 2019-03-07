import { Component, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Platform,
  LoadingController
} from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Keyboard } from '@ionic-native/keyboard';
import moment from 'moment';
import { AuthProvider } from '../../providers/auth/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { BranchIo } from '@ionic-native/branch-io';
import { ApplePay } from '@ionic-native/apple-pay';
import { Subject } from 'rxjs/Subject';
import { catchError } from 'rxjs/internal/operators/catchError';
import { retry } from 'rxjs/internal/operators/retry';
import { map } from 'rxjs/internal/operators/map';
import { Tag } from '../../providers/tag/tag';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import {
  throwError as observableThrowError,
  ReplaySubject,
  BehaviorSubject
} from 'rxjs';
import { Mixpanel } from '@ionic-native/mixpanel';
import { take } from 'rxjs/internal/operators/take';
import { NotificationProvider } from '../../providers/notification/notification';

var shippo = require('shippo')(
  // 'shippo_live_8384a2776caed1300f7ae75c45e4c32ac73b2028'
  'shippo_live_984e8c408cb8673dc9e1532e251f5ff12ca8ce60'
);

// declare var Stripe;
// var stripe = Stripe('pk_live_j1RsVuKsdIheSnlVyq55JgNv');
// var stripe = Stripe('pk_test_LXOogOz8z8Uij34BYj3IIgEw');

export interface StoreSubscription {
  name?: String | null;
  email?: String | null;
  address1?: String | null;
  address2?: String | null;
  city?: String | null;
  state?: String | null;
  zipcode?: String | null;
  amount?: Number | null;
  subscription_type?: String | null;
  start_date?: String | null;
  transaction_data?: any | null;
}

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
  selector: 'page-order-tag',
  templateUrl: 'order-tag.html'
})
export class OrderTagPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private orderForm: FormGroup;

  private subscription: StoreSubscription;
  private stateList;
  private loader;

  // private elements = stripe.elements();
  private card: any;
  private prButton: any;
  private apple_pay: any;

  private products$: Subject<any[]> = new Subject<any[]>();
  private coupons$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  private referral_discounts$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  private invites;
  private invites_allowed = 2;

  private product_amount = [];

  private products = [];
  private products_price = [];
  private total_price = 0;

  private selected_product;

  private unattached_tags = [];

  private products_ready$: Subject<any> = new Subject<any>();

  private coupon;

  // Validate form only after card element has been filled out 
  private card_element_invalid = true;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private keyboard: Keyboard,
    private platform: Platform,
    private authProvider: AuthProvider,
    private utilsProvider: UtilsProvider,
    private afs: AngularFirestore,
    private loadingCtrl: LoadingController,
    private nativeGeocoder: NativeGeocoder,
    private branch: BranchIo,
    private applePay: ApplePay,
    private mixpanel: Mixpanel,
    private notificationProvider: NotificationProvider
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


    this.subscription = {
      name: '',
      email: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipcode: '',
      amount: 1,
      subscription_type: 'com.gethuan.huanapp.yearly_subscription',
      start_date: moment().format()
    };

    // XXX FOR TESTING PURPOSES ONLY
    // this.subscription = {
    //   name: 'Test Name',
    //   email: 'gilad@gethuan.com',
    //   address1: '5605 Foxwood Dr',
    //   address2: '5678 Dr',
    //   city: 'Oak Park',
    //   state: 'CA',
    //   zipcode: '91377',
    //   amount: 1,
    //   subscription_type: 'com.gethuan.huanapp.yearly_subscription',
    //   start_date: moment().format()
    // };
    // XXX FOR TESTING PURPOSES ONLY

    this.stateList = new Array(
      'AK',
      'AL',
      'AR',
      'AZ',
      'CA',
      'CO',
      'CT',
      'DC',
      'DE',
      'FL',
      'GA',
      'GU',
      'HI',
      'IA',
      'ID',
      'IL',
      'IN',
      'KS',
      'KY',
      'LA',
      'MA',
      'MD',
      'ME',
      'MH',
      'MI',
      'MN',
      'MO',
      'MS',
      'MT',
      'NC',
      'ND',
      'NE',
      'NH',
      'NJ',
      'NM',
      'NV',
      'NY',
      'OH',
      'OK',
      'OR',
      'PA',
      'PR',
      'PW',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VA',
      'VI',
      'VT',
      'WA',
      'WI',
      'WV',
      'WY'
    );

    this.platform.ready().then(() => {
      this.keyboard.hideFormAccessoryBar(true);


      this.applePay
        .canMakePayments()
        .then(r => {
          console.log('Apple Pay canMakePayments', JSON.stringify(r));
          if (r === 'This device can make payments and has a supported card') {
            console.log('Apple Pay Enabled');

            this.apple_pay = 'enabled';
          }
        })
        .catch(e => {
          console.error('Apple Pay canMakePayments', JSON.stringify(e));

          if (
            e === 'This device can make payments but has no supported cards'
          ) {
            this.apple_pay = 'setup';
          } else {
            this.apple_pay = 'disabled';
          }
        });

    });

    this.getUnattachedTags();

    this.utilsProvider
      .getStripeSKUList()
      .then(skus => {
        skus.forEach(sku => {
          console.log('SKU', sku.id, 'PRODUCT', sku.product);

          this.utilsProvider
            .getStripeProduct(sku.product)
            .then(product => {
              console.log(JSON.stringify(product));

              this.products.push({
                product: product,
                sku: sku
              });

              this.product_amount[product.id] = 1;

              this.products$.next(this.products);

              if (this.products.length === skus.length) {
                this.products_ready$.next(true);
                // this.products_ready$.complete();
              }
            })
            .catch(e => {
              console.error(
                'Unable to retrieve product id',
                sku.product,
                JSON.stringify(e)
              );
            });
        });
      })
      .catch(e => {
        console.log('Unable to get SKU list', JSON.stringify(e));
        this.utilsProvider.displayAlert(
          'Unable to retrieve Product List',
          'Please try again later'
        );

        this.navCtrl.pop();
      });
  }

  getUnattachedTags() {
    // Check for unattached tags
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
          takeUntil(this.destroyed$),
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
          if (t.length > 0) {
            this.unattached_tags = t;

            this.updateReferralDiscounts().then(s => {
              this.invites = s;
            }).catch(e => {
              console.error('updateReferralDiscounts', e);
            })
        
          }
        });
    });
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

  getItemList() {
    var item = this.products.find(x => {
      return x.product.id === this.selected_product;
    });

    if (item) {
      var names = [];
      this.unattached_tags.forEach(t => {
        names.push(t.name);
      });

      var item_list = `${this.unattached_tags.length} x ${
        item.product.name
        } (${names.toString().replace(',', ', ')})`;

      return item_list;
    } else {
      return 'No Item Selected';
    }
  }

  getTotalAmount() {
    var total_price = 0;

    var item_price = this.products.find(x => {
      return x.product.id === this.selected_product;
    });

    if (item_price) {
      total_price = item_price.sku.price * this.unattached_tags.length;
    }
    return total_price;
  }

  selectProduct(product_id) {
    console.log('Selecting Product', product_id);

    this.mixpanel
      .track('select_product', { product: product_id })
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.selected_product = product_id;
  }

  initializeStripe() {
    var style = {
      base: {
        color: '#32325D',
        fontWeight: 500,
        fontFamily: 'Inter UI, Open Sans, Segoe UI, sans-serif',
        fontSize: '16px',
        fontSmoothing: 'antialiased',

        '::placeholder': {
          color: '#CFD7DF'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }

    // this.card = this.elements.create('card', { style: style });
    // this.card.focus();
    // setTimeout(() => {
    //   this.card.blur();
    // });

    // this.card.mount('#card-element');

    // this.card.addEventListener('change', (error) => {

    //   console.log(JSON.stringify(error));

    //   var displayError = document.getElementById('card-errors');
    //   if (error.error) {
    //     displayError.textContent = error.error.message;
    //     this.card_element_invalid = true;
    //   } else {
    //     displayError.textContent = '';
    //   }

    //   if (error.complete) {
    //     this.card_element_invalid = false;
    //   }
    // });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad OrderTagPage');

    this.products_ready$.subscribe(() => {
      console.log('Products Loaded');

      var product_to_select = this.products.sort((a, b) => {
        return b.sku.price - a.sku.price;
      });

      console.log(this.products[0].sku.price);

      this.selectProduct(this.products[0].product.id);
    });

    this.updateReferralDiscounts().then(s => {
      this.invites = s;
    }).catch(e => {
      console.error('updateReferralDiscounts', e);
    })

    this.initializeStripe();
  }

  ionViewDidEnter() {
  }

  increaseAmount(product) {
    this.product_amount[product.product.id]++;
  }

  decreaseAmount(product) {
    if (this.product_amount[product.product.id] > 0) {
      this.product_amount[product.product.id]--;
    }
  }

  gotoConfirmSubscription(addressTo, items, order_id) {
    this.showLoading();

    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);

      setRef
        .update({ subscription: '' })
        .then(data => {
          console.log(
            'confirmSubscription: Updated subscription info for user ' + uid
          );

          // var addressTo = {
          //   name: this.subscription.name,
          //   street1: this.subscription.address1,
          //   city: this.subscription.city,
          //   state: this.subscription.state,
          //   zip: this.subscription.zipcode,
          //   country: 'US',
          //   email: this.subscription.email,
          //   metadata: 'UID ' + uid
          // };

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

                self.utilsProvider.displayAlert(
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

                    console.log(JSON.stringify(items));

                    // self.utilsProvider
                    //   .createShippoOrder(address, addressFrom, items)
                    //   .then(r => {
                    console.log('createShippoOrder', JSON.stringify(r));

                    self
                      .updateUnattachedTagsOrder(order_id)
                      .then(r => {
                        console.log('Updated tags with order id');

                        self.dismissLoading();
                        self.navCtrl.push('ConfirmSubscriptionPage');
                      })
                      .catch(e => {
                        self.dismissLoading();

                        console.error(
                          'Unable to update tags with order id'
                        );
                      });
                    // })
                    // .catch(e => {
                    //   console.error('createShippoOrder', JSON.stringify(e));
                    // });

                    /*
                    self.utilsProvider
                      .createSupportTicket(
                        addressTo.name,
                        addressTo.email,
                        'New Tag Order',
                        addressTo
                      )
                      .then(data => {
                        console.log('Created new ticket: ' + data);

                        self.branch
                          .userCompletedAction('order_tags', {
                            uid: uid,
                            tags: self.unattached_tags.length
                          })
                          .then(r => {})
                          .catch(e => {});

                        self.dismissLoading();
                        self.navCtrl.push('ConfirmSubscriptionPage');
                      })
                      .catch(error => {
                        console.error(
                          'Error creating ticket: ' + JSON.stringify(error)
                        );

                        self.dismissLoading();

                        self.utilsProvider.displayAlert(
                          'Unable to proceed',
                          JSON.stringify(error.error)
                        );
                      });
                      */
                  })
                  .catch(e => {
                    self.utilsProvider.displayAlert(
                      'Invalid Address',
                      'Unable to validate address. Please check and try again.'
                    );

                    console.error('forwardGeocode', e);
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

  gotoChooseSubscription() {
    this.navCtrl.push('ChooseSubscriptionPage', this.subscription);
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

  payWithApplePay() {
    this.mixpanel
      .track('pay_with_apple_pay')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    var amount = this.getTotalAmountAfterDiscount() / 100;
    var tax = amount * 0.0725;
    var shipping = 2.66;
    // var total = amount + shipping + tax;
    var total = amount + tax;
    var label = this.getItemList();

    this.applePay
      .makePaymentRequest({
        items: [
          {
            label: label,
            amount: amount
          },
          {
            label: 'Estimated Sales Tax',
            amount: tax
          },
          // {
          //   label: 'Shipping',
          //   amount: shipping
          // },

          {
            label: 'Total',
            amount: total
          }
        ],
        merchantIdentifier: 'merchant.com.gethuan.huanapp',
        currencyCode: 'USD',
        countryCode: 'US',
        billingAddressRequirement: 'none',
        shippingAddressRequirement: 'all',
        shippingType: 'shipping'
      })
      .then(paymentResponse => {
        console.log('payWithApplePay', JSON.stringify(paymentResponse));

        const token = paymentResponse.stripeToken;

        var customer = {
          description: 'Customer for ' + paymentResponse.shippingEmailAddress,
          email: paymentResponse.shippingEmailAddress,
          shipping: {
            address: {
              line1: paymentResponse.shippingAddressStreet,
              city: paymentResponse.shippingAddressCity,
              postal_code: paymentResponse.shippingPostalCode,
              state: paymentResponse.shippingAddressState,
              // country: paymentResponse.shippingCountry
              country: 'US',
              phone: paymentResponse.shippingPhoneNumber
            },
            name:
              paymentResponse.shippingNameFirst +
              ' ' +
              paymentResponse.shippingNameLast,
            phone: paymentResponse.shippingPhoneNumber
          },
          source: token
        };

        var product = this.products.find(x => {
          return x.product.id === this.selected_product;
        });

        var items = [];

        items.push({
          type: 'sku',
          parent: product.sku.id,
          quantity: this.unattached_tags.length
        });

        this.utilsProvider
          .createStripeOrder(customer, null, items)
          .then(order => {
            console.log(JSON.stringify(order));
            this.applePay
              .completeLastTransaction('success')
              .then(r => {
                this.mixpanel
                  .track('apple_pay_success')
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                console.log(JSON.stringify(r));

                var addressTo = {
                  name: customer.shipping.name,
                  street1: customer.shipping.address.line1,
                  city: customer.shipping.address.city,
                  state: customer.shipping.address.state,
                  zip: customer.shipping.address.postal_code,
                  country: 'US',
                  email: customer.email
                };

                this.gotoConfirmSubscription(
                  addressTo,
                  order.items[0],
                  order.id
                );
              })
              .catch(e => {
                console.error(JSON.stringify(e));
              });
          })
          .catch(e => {
            this.mixpanel
              .track('apple_pay_failure')
              .then(() => { })
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            console.error(JSON.stringify(e));
            this.applePay
              .completeLastTransaction('failure')
              .then(r => {
                console.log(JSON.stringify(r));

                this.utilsProvider.displayAlert(
                  'Unable to complete transaction',
                  'Please contact support.'
                );
              })
              .catch(e => {
                console.error(JSON.stringify(e));
              });
          });
      })
      .catch(e => {
        // Failed to open the Apple Pay sheet, or the user cancelled the payment.
        this.mixpanel
          .track('apply_pay_cancel')
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        console.error('payWithApplePay', JSON.stringify(e));
      });
  }

  payWithCreditCard() {
    this.mixpanel
      .track('pay_with_credit_card')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.showLoading();

    var amount = this.getTotalAmountAfterDiscount() / 100;
    var tax = amount * 0.0725;
    var shipping = 2.66;
    var total = amount + shipping + tax;
    var label = this.getItemList();

    var self = this;
    /*
    stripe.createToken(this.card).then(result => {
      if (result.error) {
        console.error(result.error);

        this.mixpanel
          .track('credit_card_error')
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        self.dismissLoading();

        // Inform the user if there was an error.
        var errorElement = document.getElementById('card-errors');
        errorElement.textContent = result.error.message;
      } else {
        console.log('Received card token', result.token);

        this.mixpanel
          .track('credit_card_success')
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        const token = result.token;

        var customer = {
          description: 'Customer for ' + this.subscription.email,
          email: this.subscription.email,
          shipping: {
            address: {
              line1: this.subscription.address1,
              city: this.subscription.city,
              postal_code: this.subscription.zipcode,
              state: this.subscription.state,
              // country: paymentResponse.shippingCountry
              country: 'US'
              // phone: '555-123-1234'
            },
            name: this.subscription.name
            // phone: paymentResponse.shippingPhoneNumber
          },
          source: token.id
        };

        var product = this.products.find(x => {
          return x.product.id === this.selected_product;
        });

        var items = [];

        items.push({
          type: 'sku',
          parent: product.sku.id,
          quantity: this.unattached_tags.length
        });

        var addressTo = {
          name: customer.shipping.name,
          street1: customer.shipping.address.line1,
          city: customer.shipping.address.city,
          state: customer.shipping.address.state,
          zip: customer.shipping.address.postal_code,
          country: 'US',
          email: customer.email,
          validate: true
        };

        var self = this;
        shippo.address.create(addressTo, function (err, address) {
          if (err) {
            console.error('address', err);
            self.utilsProvider.displayAlert('Address Validation Error', err);
          } else {
            console.log('validate', JSON.stringify(address));

            if (!address.validation_results.is_valid) {
              console.error('Address invalid');
              self.dismissLoading();

              self.utilsProvider.displayAlert(
                address.validation_results.messages[0].code,
                address.validation_results.messages[0].text
              );
            } else {
              console.log('order items', JSON.stringify(items));

              self.utilsProvider
                .createStripeOrder(customer, null, items)
                .then(order => {
                  console.log(JSON.stringify(order));

                  // var addressTo = {
                  //   name: customer.shipping.name,
                  //   street1: customer.shipping.address.line1,
                  //   city: customer.shipping.address.city,
                  //   state: customer.shipping.address.state,
                  //   zip: customer.shipping.address.postal_code,
                  //   country: 'US',
                  //   email: customer.email
                  // };

                  self.dismissLoading();
                  self.gotoConfirmSubscription(
                    addressTo,
                    order.items[0],
                    order.id
                  );
                })
                .catch(e => {
                  self.dismissLoading();

                  self.utilsProvider.displayAlert(
                    'Unable to complete transaction',
                    'There was an error processing your payment.'
                  );

                  console.error(JSON.stringify(e));
                });
            }
          }
        });
      }
    });
    */
  }

  getTotalAmountAfterDiscount() {
    var discount;

    if (this.referral_discounts$.value.length > 0) {
      discount = this.referral_discounts$.value[0].amount;
    }

    if (this.coupons$.value.length > 0) {
      discount += this.getCouponDiscount();
    }


    var total = this.getTotalAmount() - discount;
    return (total < 0 ? 0 : total) + 266;
  }

  getCouponDiscount() {
    return (this.getTotalAmount() * this.coupons$.value[0].discount);
  }

  applyCoupon() {
    var coupon = this.coupon.toString().toLowerCase();

    this.afs
      .collection<Tag>('Coupons')
      .doc(coupon)
      .ref.onSnapshot(doc => {
        if (doc.exists) {
          console.log('Coupon', coupon, 'Valid');

          var coupon_data = doc.data();
          var discount: number = 0;

          console.log(JSON.stringify(coupon_data));

          if (coupon_data.units === 'percent') {
            var discount_amount: number = coupon_data.value / 100;
            discount = this.getTotalAmount() * discount_amount / 100;

            this.coupons$.next([{
              description: coupon_data.description,
              discount: discount_amount
            }]);

            console.log(discount_amount, discount.toFixed(2));
          }


          this.mixpanel
            .track('coupon_applied', { coupon: coupon })
            .then(() => { })
            .catch(e => {
              console.error('Mixpanel Error', e);
            });
        } else {
          // Coupon invalid
          console.error('Coupon', coupon, 'Invalid');

          this.mixpanel
            .track('coupon_invalid', { coupon: coupon })
            .then(() => { })
            .catch(e => {
              console.error('Mixpanel Error', e);
            });

        }
      });
  }

  getStripeCardErrors() {
    var error_element = this.card.getElementById('card-errors').innerText;

    return error_element.length > 0;
  }

  updateReferralDiscounts() {
    return new Promise((resolve, reject) => {
      this.utilsProvider
        .getCurrentScore('invite')
        .then(s => {
          var score: number = Number(s);

          var ref_count = 0;
          if (score < this.invites_allowed) {
            ref_count = score;
          } else {
            ref_count = this.invites_allowed;
          }

          this.referral_discounts$.next([{
            description: `${ref_count} x Invites Sent`,
            amount: (1000 * this.unattached_tags.length) * ref_count
          }]);

          resolve(s);
        })
        .catch(e => {
          console.error('upateBanner', e);
          reject(e);
        });
    });
  }

  getInvitesAvailable() {
    if (this.invites < this.invites_allowed) {
      return this.invites_allowed - this.invites;
    } else {
      return 0;
    }
  }

  sendInvite() {
    this.authProvider
      .getAccountInfo(false)
      .then(account => {
        this.utilsProvider
          .textReferralCode(
            account.displayName,
            this.notificationProvider.getFCMToken()
          )
          .then(r => {
            console.log('sendInvite', r);

            // Wait for 1 second to ensure Branch updated their database
            setTimeout(() => {
              this.updateReferralDiscounts()
                .then(s => {
                  this.invites = s;

                  console.log('updateBanner', s);
                })
                .catch(e => {
                  console.error('updateBanner', e);
                });
            }, 1000);
          })
          .catch(e => {
            console.warn('textReferralCode', e);
          });
      })
      .catch(e => {
        console.error('sendInvite(): ERROR: Unable to get account info!', e);
      });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
