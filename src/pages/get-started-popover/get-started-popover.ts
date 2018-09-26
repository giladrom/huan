import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController
} from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-get-started-popover',
  templateUrl: 'get-started-popover.html'
})
export class GetStartedPopoverPage {
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private viewCtrl: ViewController
  ) {}

  addPet() {
    this.navCtrl
      .getPrevious()
      .getNav()
      .push('AddPage')
      .then(() => {
        // this.viewCtrl.dismiss();
      });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad GetStartedPopoverPage');
  }
}
