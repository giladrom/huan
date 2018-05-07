import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-incompatible-tag',
  templateUrl: 'incompatible-tag.html',
})
export class IncompatibleTagPage {

  constructor(public navCtrl: NavController, public navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad IncompatibleTagPage');
  }

}
