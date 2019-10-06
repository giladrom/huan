var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, LoadingController } from 'ionic-angular';
import { FormBuilder, Validators } from '@angular/forms';
import { Keyboard } from '@ionic-native/keyboard';
import moment from 'moment';
import { AuthProvider } from '../../providers/auth/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { BranchIo } from '@ionic-native/branch-io';
import { ApplePay } from '@ionic-native/apple-pay';
import { Subject } from 'rxjs/Subject';
import { catchError } from 'rxjs/internal/operators/catchError';
import { retry } from 'rxjs/internal/operators/retry';
import { map } from 'rxjs/internal/operators/map';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { throwError as observableThrowError, ReplaySubject, BehaviorSubject } from 'rxjs';
import { Mixpanel } from '@ionic-native/mixpanel';
import { NotificationProvider } from '../../providers/notification/notification';
var shippo = require('shippo')(
// 'shippo_live_8384a2776caed1300f7ae75c45e4c32ac73b2028'
'shippo_live_984e8c408cb8673dc9e1532e251f5ff12ca8ce60');
// Shippo configuration objects
var addressFrom = {
    name: 'Valinor LLC',
    street1: '638 Lindero Canyon Rd STE 118',
    city: 'Oak Park',
    state: 'CA',
    zip: '91377',
    country: 'US'
};
var OrderTagPage = /** @class */ (function () {
    function OrderTagPage(navCtrl, navParams, formBuilder, keyboard, platform, authProvider, utilsProvider, afs, loadingCtrl, nativeGeocoder, branch, applePay, mixpanel, notificationProvider) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.formBuilder = formBuilder;
        this.keyboard = keyboard;
        this.platform = platform;
        this.authProvider = authProvider;
        this.utilsProvider = utilsProvider;
        this.afs = afs;
        this.loadingCtrl = loadingCtrl;
        this.nativeGeocoder = nativeGeocoder;
        this.branch = branch;
        this.applePay = applePay;
        this.mixpanel = mixpanel;
        this.notificationProvider = notificationProvider;
        this.destroyed$ = new ReplaySubject(1);
        this.products$ = new Subject();
        this.coupons$ = new BehaviorSubject([]);
        this.referral_discounts$ = new BehaviorSubject([]);
        this.invites_allowed = 2;
        this.product_amount = [];
        this.products = [];
        this.products_price = [];
        this.total_price = 0;
        this.unattached_tags = [];
        this.products_ready$ = new Subject();
        // Validate form only after card element has been filled out 
        this.card_element_invalid = true;
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
        this.stateList = new Array('AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MH', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'PW', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY');
        this.platform.ready().then(function () {
            _this.keyboard.hideFormAccessoryBar(true);
            _this.applePay
                .canMakePayments()
                .then(function (r) {
                console.log('Apple Pay canMakePayments', JSON.stringify(r));
                if (r === 'This device can make payments and has a supported card') {
                    console.log('Apple Pay Enabled');
                    _this.apple_pay = 'enabled';
                }
            })
                .catch(function (e) {
                console.error('Apple Pay canMakePayments', JSON.stringify(e));
                if (e === 'This device can make payments but has no supported cards') {
                    _this.apple_pay = 'setup';
                }
                else {
                    _this.apple_pay = 'disabled';
                }
            });
        });
        this.getUnattachedTags();
        this.utilsProvider
            .getStripeSKUList()
            .then(function (skus) {
            skus.forEach(function (sku) {
                console.log('SKU', sku.id, 'PRODUCT', sku.product);
                _this.utilsProvider
                    .getStripeProduct(sku.product)
                    .then(function (product) {
                    console.log(JSON.stringify(product));
                    _this.products.push({
                        product: product,
                        sku: sku
                    });
                    _this.product_amount[product.id] = 1;
                    _this.products$.next(_this.products);
                    if (_this.products.length === skus.length) {
                        _this.products_ready$.next(true);
                        // this.products_ready$.complete();
                    }
                })
                    .catch(function (e) {
                    console.error('Unable to retrieve product id', sku.product, JSON.stringify(e));
                });
            });
        })
            .catch(function (e) {
            console.log('Unable to get SKU list', JSON.stringify(e));
            _this.utilsProvider.displayAlert('Unable to retrieve Product List', 'Please try again later');
            _this.navCtrl.pop();
        });
    }
    OrderTagPage.prototype.getUnattachedTags = function () {
        var _this = this;
        // Check for unattached tags
        this.authProvider.getUserId().then(function (uid) {
            var unsub = _this.afs
                .collection('Tags', function (ref) {
                return ref
                    .where('uid', 'array-contains', uid)
                    .where('tagattached', '==', false)
                    .where('order_status', '==', 'none');
            })
                .stateChanges()
                .pipe(catchError(function (e) { return observableThrowError(e); }), retry(2), takeUntil(_this.destroyed$), map(function (actions) {
                return actions.map(function (a) {
                    var data = a.payload.doc.data();
                    var id = a.payload.doc.id;
                    return __assign({ id: id }, data);
                });
            }))
                .subscribe(function (t) {
                unsub.unsubscribe();
                if (t.length > 0) {
                    _this.unattached_tags = t;
                    _this.updateReferralDiscounts().then(function (s) {
                        _this.invites = s;
                    }).catch(function (e) {
                        console.error('updateReferralDiscounts', e);
                    });
                }
            });
        });
    };
    OrderTagPage.prototype.updateUnattachedTagsOrder = function (order) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.authProvider.getUserId().then(function (uid) {
                var unsub = _this.afs
                    .collection('Tags', function (ref) {
                    return ref
                        .where('uid', 'array-contains', uid)
                        .where('tagattached', '==', false)
                        .where('order_status', '==', 'none');
                })
                    .stateChanges()
                    .pipe(catchError(function (e) { return observableThrowError(e); }), retry(2), map(function (actions) {
                    return actions.map(function (a) {
                        var data = a.payload.doc.data();
                        var id = a.payload.doc.id;
                        return __assign({ id: id }, data);
                    });
                }))
                    .subscribe(function (t) {
                    unsub.unsubscribe();
                    t.forEach(function (doc) {
                        console.log("Updating tag " + doc.id + " with order number " + order);
                        _this.afs
                            .collection('Tags')
                            .doc(doc.id)
                            .update({
                            order_status: order
                        })
                            .then(function () {
                            console.log('Successfully updated');
                            resolve(true);
                        })
                            .catch(function (e) {
                            console.error('Unable to update', JSON.stringify(e));
                            reject(e);
                        });
                    });
                });
            });
        });
    };
    OrderTagPage.prototype.getItemList = function () {
        var _this = this;
        var item = this.products.find(function (x) {
            return x.product.id === _this.selected_product;
        });
        if (item) {
            var names = [];
            this.unattached_tags.forEach(function (t) {
                names.push(t.name);
            });
            var item_list = this.unattached_tags.length + " x " + item.product.name + " (" + names.toString().replace(',', ', ') + ")";
            return item_list;
        }
        else {
            return 'No Item Selected';
        }
    };
    OrderTagPage.prototype.getTotalAmount = function () {
        var _this = this;
        var total_price = 0;
        var item_price = this.products.find(function (x) {
            return x.product.id === _this.selected_product;
        });
        if (item_price) {
            total_price = item_price.sku.price * this.unattached_tags.length;
        }
        return total_price;
    };
    OrderTagPage.prototype.selectProduct = function (product_id) {
        console.log('Selecting Product', product_id);
        this.mixpanel
            .track('select_product', { product: product_id })
            .then(function () { })
            .catch(function (e) {
            console.error('Mixpanel Error', e);
        });
        this.selected_product = product_id;
    };
    OrderTagPage.prototype.initializeStripe = function () {
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
        };
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
    };
    OrderTagPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        console.log('ionViewDidLoad OrderTagPage');
        this.products_ready$.subscribe(function () {
            console.log('Products Loaded');
            var product_to_select = _this.products.sort(function (a, b) {
                return b.sku.price - a.sku.price;
            });
            console.log(_this.products[0].sku.price);
            _this.selectProduct(_this.products[0].product.id);
        });
        this.updateReferralDiscounts().then(function (s) {
            _this.invites = s;
        }).catch(function (e) {
            console.error('updateReferralDiscounts', e);
        });
        this.initializeStripe();
    };
    OrderTagPage.prototype.ionViewDidEnter = function () {
    };
    OrderTagPage.prototype.increaseAmount = function (product) {
        this.product_amount[product.product.id]++;
    };
    OrderTagPage.prototype.decreaseAmount = function (product) {
        if (this.product_amount[product.product.id] > 0) {
            this.product_amount[product.product.id]--;
        }
    };
    OrderTagPage.prototype.gotoConfirmSubscription = function (addressTo, items, order_id) {
        var _this = this;
        this.showLoading();
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef
                .update({ subscription: '' })
                .then(function (data) {
                console.log('confirmSubscription: Updated subscription info for user ' + uid);
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
                var self = _this;
                shippo.address.create(validate, function (err, address) {
                    if (err) {
                        console.error('address', err);
                    }
                    else {
                        console.log('validate', JSON.stringify(address));
                        if (!address.validation_results.is_valid) {
                            console.error('Address invalid');
                            self.dismissLoading();
                            self.utilsProvider.displayAlert(address.validation_results.messages[0].code, address.validation_results.messages[0].text);
                        }
                        else {
                            self.nativeGeocoder
                                .forwardGeocode(address.street1 + " " + address.city + " " + address.zip)
                                .then(function (r) {
                                console.log('Resolved address', JSON.stringify(r));
                                console.log(JSON.stringify(items));
                                // self.utilsProvider
                                //   .createShippoOrder(address, addressFrom, items)
                                //   .then(r => {
                                console.log('createShippoOrder', JSON.stringify(r));
                                self
                                    .updateUnattachedTagsOrder(order_id)
                                    .then(function (r) {
                                    console.log('Updated tags with order id');
                                    self.dismissLoading();
                                    self.navCtrl.push('ConfirmSubscriptionPage');
                                })
                                    .catch(function (e) {
                                    self.dismissLoading();
                                    console.error('Unable to update tags with order id');
                                });
                            })
                                .catch(function (e) {
                                self.utilsProvider.displayAlert('Invalid Address', 'Unable to validate address. Please check and try again.');
                                console.error('forwardGeocode', e);
                            });
                        }
                    }
                });
            })
                .catch(function (error) {
                _this.dismissLoading();
                console.error('confirmSubscription: Unable to update Firestore: ' +
                    JSON.stringify(error));
            });
        });
    };
    OrderTagPage.prototype.gotoChooseSubscription = function () {
        this.navCtrl.push('ChooseSubscriptionPage', this.subscription);
    };
    OrderTagPage.prototype.showLoading = function () {
        if (!this.loader) {
            this.loader = this.loadingCtrl.create({
                content: 'Please Wait...'
            });
            this.loader.present();
        }
    };
    OrderTagPage.prototype.dismissLoading = function () {
        if (this.loader) {
            this.loader.dismiss();
            this.loader = null;
        }
    };
    OrderTagPage.prototype.payWithApplePay = function () {
        var _this = this;
        this.mixpanel
            .track('pay_with_apple_pay')
            .then(function () { })
            .catch(function (e) {
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
            .then(function (paymentResponse) {
            console.log('payWithApplePay', JSON.stringify(paymentResponse));
            var token = paymentResponse.stripeToken;
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
                    name: paymentResponse.shippingNameFirst +
                        ' ' +
                        paymentResponse.shippingNameLast,
                    phone: paymentResponse.shippingPhoneNumber
                },
                source: token
            };
            var product = _this.products.find(function (x) {
                return x.product.id === _this.selected_product;
            });
            var items = [];
            items.push({
                type: 'sku',
                parent: product.sku.id,
                quantity: _this.unattached_tags.length
            });
            _this.utilsProvider
                .createStripeOrder(customer, null, items)
                .then(function (order) {
                console.log(JSON.stringify(order));
                _this.applePay
                    .completeLastTransaction('success')
                    .then(function (r) {
                    _this.mixpanel
                        .track('apple_pay_success')
                        .then(function () { })
                        .catch(function (e) {
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
                    _this.gotoConfirmSubscription(addressTo, order.items[0], order.id);
                })
                    .catch(function (e) {
                    console.error(JSON.stringify(e));
                });
            })
                .catch(function (e) {
                _this.mixpanel
                    .track('apple_pay_failure')
                    .then(function () { })
                    .catch(function (e) {
                    console.error('Mixpanel Error', e);
                });
                console.error(JSON.stringify(e));
                _this.applePay
                    .completeLastTransaction('failure')
                    .then(function (r) {
                    console.log(JSON.stringify(r));
                    _this.utilsProvider.displayAlert('Unable to complete transaction', 'Please contact support.');
                })
                    .catch(function (e) {
                    console.error(JSON.stringify(e));
                });
            });
        })
            .catch(function (e) {
            // Failed to open the Apple Pay sheet, or the user cancelled the payment.
            _this.mixpanel
                .track('apply_pay_cancel')
                .then(function () { })
                .catch(function (e) {
                console.error('Mixpanel Error', e);
            });
            console.error('payWithApplePay', JSON.stringify(e));
        });
    };
    OrderTagPage.prototype.payWithCreditCard = function () {
        this.mixpanel
            .track('pay_with_credit_card')
            .then(function () { })
            .catch(function (e) {
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
    };
    OrderTagPage.prototype.getTotalAmountAfterDiscount = function () {
        var discount;
        if (this.referral_discounts$.value.length > 0) {
            discount = this.referral_discounts$.value[0].amount;
        }
        if (this.coupons$.value.length > 0) {
            discount += this.getCouponDiscount();
        }
        var total = this.getTotalAmount() - discount;
        return (total < 0 ? 0 : total) + 266;
    };
    OrderTagPage.prototype.getCouponDiscount = function () {
        return (this.getTotalAmount() * this.coupons$.value[0].discount);
    };
    OrderTagPage.prototype.applyCoupon = function () {
        var _this = this;
        var coupon = this.coupon.toString().toLowerCase();
        this.afs
            .collection('Coupons')
            .doc(coupon)
            .ref.onSnapshot(function (doc) {
            if (doc.exists) {
                console.log('Coupon', coupon, 'Valid');
                var coupon_data = doc.data();
                var discount = 0;
                console.log(JSON.stringify(coupon_data));
                if (coupon_data.units === 'percent') {
                    var discount_amount = coupon_data.value / 100;
                    discount = _this.getTotalAmount() * discount_amount / 100;
                    _this.coupons$.next([{
                            description: coupon_data.description,
                            discount: discount_amount
                        }]);
                    console.log(discount_amount, discount.toFixed(2));
                }
                _this.mixpanel
                    .track('coupon_applied', { coupon: coupon })
                    .then(function () { })
                    .catch(function (e) {
                    console.error('Mixpanel Error', e);
                });
            }
            else {
                // Coupon invalid
                console.error('Coupon', coupon, 'Invalid');
                _this.mixpanel
                    .track('coupon_invalid', { coupon: coupon })
                    .then(function () { })
                    .catch(function (e) {
                    console.error('Mixpanel Error', e);
                });
            }
        });
    };
    OrderTagPage.prototype.getStripeCardErrors = function () {
        var error_element = this.card.getElementById('card-errors').innerText;
        return error_element.length > 0;
    };
    OrderTagPage.prototype.updateReferralDiscounts = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.utilsProvider
                .getCurrentScore('invite')
                .then(function (s) {
                var score = Number(s);
                var ref_count = 0;
                if (score < _this.invites_allowed) {
                    ref_count = score;
                }
                else {
                    ref_count = _this.invites_allowed;
                }
                _this.referral_discounts$.next([{
                        description: ref_count + " x Invites Sent",
                        amount: (1000 * _this.unattached_tags.length) * ref_count
                    }]);
                resolve(s);
            })
                .catch(function (e) {
                console.error('upateBanner', e);
                reject(e);
            });
        });
    };
    OrderTagPage.prototype.getInvitesAvailable = function () {
        if (this.invites < this.invites_allowed) {
            return this.invites_allowed - this.invites;
        }
        else {
            return 0;
        }
    };
    OrderTagPage.prototype.sendInvite = function () {
        var _this = this;
        this.authProvider
            .getAccountInfo(false)
            .then(function (account) {
            _this.utilsProvider
                .textReferralCode(account.displayName, account.team ? account.team : '', _this.notificationProvider.getFCMToken())
                .then(function (r) {
                console.log('sendInvite', r);
                // Wait for 1 second to ensure Branch updated their database
                setTimeout(function () {
                    _this.updateReferralDiscounts()
                        .then(function (s) {
                        _this.invites = s;
                        console.log('updateBanner', s);
                    })
                        .catch(function (e) {
                        console.error('updateBanner', e);
                    });
                }, 1000);
            })
                .catch(function (e) {
                console.warn('textReferralCode', e);
            });
        })
            .catch(function (e) {
            console.error('sendInvite(): ERROR: Unable to get account info!', e);
        });
    };
    OrderTagPage.prototype.ngOnDestroy = function () {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    };
    OrderTagPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-order-tag',
            templateUrl: 'order-tag.html'
        }),
        __metadata("design:paramtypes", [NavController,
            NavParams,
            FormBuilder,
            Keyboard,
            Platform,
            AuthProvider,
            UtilsProvider,
            AngularFirestore,
            LoadingController,
            NativeGeocoder,
            BranchIo,
            ApplePay,
            Mixpanel,
            NotificationProvider])
    ], OrderTagPage);
    return OrderTagPage;
}());
export { OrderTagPage };
//# sourceMappingURL=order-tag.js.map