import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Mixpanel } from '@ionic-native/mixpanel';

/**
 * Generated class for the TermsOfUsePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-terms-of-use',
  templateUrl: 'terms-of-use.html',
})
export class TermsOfUsePage {

  constructor(public navCtrl: NavController, public navParams: NavParams, private mixpanel: Mixpanel) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad TermsOfUsePage');

    this.mixpanel.track('show_terms_of_use').then(() => {}).catch(e => {
      console.error('Mixpanel Error', e);
    });

  }

}
