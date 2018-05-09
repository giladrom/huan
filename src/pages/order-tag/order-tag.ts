import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Keyboard } from '@ionic-native/keyboard';

export interface StoreSubscription {
  name: String | null;
  email: String | null;
  address1: String | null;
  address2: String | null;
  city: String | null;
  state: String | null;
  zipcode: String | null;
  amount: Number | null;
  subscription_type: String | null;
  start_date: String | null;
  transaction_data?: any | null;
}

@IonicPage()
@Component({
  selector: 'page-order-tag',
  templateUrl: 'order-tag.html'
})
export class OrderTagPage {
  private orderForm: FormGroup;

  private subscription: StoreSubscription;
  private stateList;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private formBuilder: FormBuilder,
    private keyboard: Keyboard,
    private platform: Platform
  ) {
    this.orderForm = this.formBuilder.group({
      name: [
        '',
        Validators.compose([
          Validators.required,
          Validators.minLength(2),
          Validators.pattern('^[a-zA-Z\\s*]+$')
        ])
      ],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      address1: [
        '',
        Validators.compose([Validators.required, Validators.minLength(2)])
      ],
      address2: [''],
      city: ['', [Validators.required, Validators.pattern('^[a-zA-Z\\s*]+$')]],
      state: ['', [Validators.required, Validators.pattern('^[a-zA-Z\\s*]+$')]],
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
      start_date: Date.now().toString()
    };

    // XXX FOR TESTING PURPOSES ONLY
    // this.subscription = {
    //   name: 'Test Name',
    //   email: 'testemail@gmail.com',
    //   address1: '1234 Test Address',
    //   address2: '',
    //   city: 'Los Angeles',
    //   state: 'CA',
    //   zipcode: '90210',
    //   amount: 1,
    //   subscription_type: 'com.gethuan.huanapp.yearly_subscription',
    //   start_date: Date.now().toString()
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

  gotoChooseSubscription() {
    this.navCtrl.push('ChooseSubscriptionPage', this.subscription);
  }
}
