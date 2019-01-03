import { Component } from '@angular/core';
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
import { AngularFirestore, validateEventsArray } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import { SelectDropDownComponent } from 'ngx-select-dropdown';
import { NativeGeocoder } from '@ionic-native/native-geocoder';

var shippo = require('shippo')(
  // 'shippo_live_8384a2776caed1300f7ae75c45e4c32ac73b2028'
  'shippo_test_a414dd0ef287202af1a7843cacbae87b951d3c9a'
);

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

var parcel = {
  length: '8',
  width: '4',
  height: '0.1',
  distance_unit: 'in',
  weight: '0.06',
  mass_unit: 'lb'
};

@IonicPage()
@Component({
  selector: 'page-order-tag',
  templateUrl: 'order-tag.html'
})
export class OrderTagPage {
  private orderForm: FormGroup;

  private subscription: StoreSubscription;
  private stateList;
  private loader;

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
    private nativeGeocoder: NativeGeocoder
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
          // Validators.required,
          Validators.maxLength(30),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ]
      ],
      zipcode: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(5),
          Validators.pattern('^[0-9]+$')
        ])
      ],
      amount: ['', Validators.required]
    });

    this.subscription = {
      name: '',
      email: '',
      address1: '',
      address2: '',
      city: '',
      state: '--',
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
      this.keyboard.hideKeyboardAccessoryBar(false);
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad OrderTagPage');
  }

  gotoConfirmSubscription() {
    if (this.subscription.state !== 'CA') {
      this.utilsProvider.displayAlert(
        "We're not there yet!",
        'Huan tags are still not available in your area. Please stay tuned!'
      );
      return;
    }

    this.showLoading();

    this.authProvider.getUserId().then(uid => {
      var setRef = this.afs.collection('Users').doc(uid);

      setRef
        .update({ subscription: '' })
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
                self.utilsProvider.displayAlert(
                  address.validation_results.messages[0].code,
                  address.validation_results.messages[0].text
                );
              } else {
                // Make sure shipping address is in the LA area only for the moment

                self.nativeGeocoder
                  .forwardGeocode(
                    `${address.street1} ${address.city} ${address.zip}`
                  )
                  .then(r => {
                    console.log('Resolved address', JSON.stringify(r));

                    if (
                      Number(r[0].longitude) < -118.9 ||
                      Number(r[0].longitude) > -117.3 ||
                      (Number(r[0].latitude) < 33.6 ||
                        Number(r[0].latitude) > 34.2)
                    ) {
                      self.dismissLoading();

                      self.utilsProvider.displayAlert(
                        "We're not there yet!",
                        'Huan tags are still not available in your area. Please stay tuned!'
                      );
                    } else {
                      // shippo.shipment.create(
                      //   {
                      //     address_from: addressFrom,
                      //     address_to: address,
                      //     parcels: [parcel],
                      //     async: false,
                      //     extra: {
                      //       reference_1:
                      //         'Contains ' +
                      //         self.subscription.amount +
                      //         ' Huan Tags'
                      //     }
                      //   },
                      //   function(err, shipment) {
                      //     if (err) {
                      //       console.error('shipment', err);
                      //     } else {
                      //       shipment.rates.forEach(rate => {
                      //         console.log(rate.attributes);

                      //         if (rate.attributes.indexOf('CHEAPEST') > 0) {
                      //           console.log('Found cheapest rate');

                      //           shippo.transaction.create(
                      //             {
                      //               rate: rate.object_id,
                      //               label_file_type: 'PDF',
                      //               async: false
                      //             },
                      //             function(err, transaction) {
                      //               if (err) {
                      //                 console.error('transaction', err);
                      //               } else {
                      //                 console.warn(JSON.stringify(transaction));
                      //               }
                      //             }
                      //           );
                      //         }
                      //       });
                      //     }
                      //   }
                      // );

                      // shippo.address
                      //   .create({
                      //     name: self.subscription.name,
                      //     company: '',
                      //     street1: self.subscription.address1,
                      //     city: self.subscription.city,
                      //     state: self.subscription.state,
                      //     zip: self.subscription.zipcode,
                      //     country: 'US',
                      //     phone: '',
                      //     email: self.subscription.email
                      //   })
                      //   .then(address => {
                      //     console.warn(
                      //       'Shippo shipment : %s',
                      //       JSON.stringify(address)
                      //     );
                      //   })
                      //   .catch(e => {
                      //     console.error('Shippo', e);
                      //   });

                      self.utilsProvider
                        .createShippoOrder(
                          address,
                          addressFrom,
                          self.subscription.amount
                        )
                        .then(r => {
                          console.log('createShippoOrder', JSON.stringify(r));
                        })
                        .catch(e => {
                          console.error('createShippoOrder', JSON.stringify(e));
                        });

                      self.utilsProvider
                        .createSupportTicket(
                          self.subscription.name,
                          self.subscription.email,
                          'New Tag Order',
                          self.utilsProvider.subscriptionToString(
                            self.subscription
                          )
                        )
                        .then(data => {
                          console.log('Created new ticket: ' + data);

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
                    }
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
}
