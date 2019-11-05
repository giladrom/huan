import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController,
  Platform
} from 'ionic-angular';

/* QR Scanner modal and module courtesy of
 * https://github.com/getbitpocket/bitpocket-mobile-app
 */

@IonicPage()
@Component({
  selector: 'page-qrscanner',
  templateUrl: 'qrscanner.html'
})
export class QRScannerPage {
  protected light: boolean = false;
  protected frontCamera: boolean = false;
  protected validate: any;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private viewController: ViewController,
    private platform: Platform
  ) {
    this.platform.registerBackButtonAction(() => {
      this.close();
    });
  }

  close(data: any = null) {
    this.viewController.dismiss(data);
  }

  toggleCamera() {
    this.frontCamera = !this.frontCamera;

    if (this.frontCamera) {
      window['QRScanner'].useFrontCamera();
    } else {
      window['QRScanner'].useBackCamera();
    }
  }

  toggleLight() {
    this.light = !this.light;

    if (this.light) {
      window['QRScanner'].enableLight();
    } else {
      window['QRScanner'].disableLight();
    }
  }

  setupScanner() {
    window['QRScanner'].prepare(() => {
      window['QRScanner'].scan((error, text) => {
        if (error) {
          this.close();
        } else {
          console.log('Scanned', text);

          this.close({
            text: text
          });
        }
      });
    });
  }

  ionViewWillEnter() {
    this.setupScanner();
    window['QRScanner'].show();
    window.document.querySelector('ion-app > .app-root').classList.add('hide');
  }

  ionViewWillLeave() {
    window.document
      .querySelector('ion-app > .app-root')
      .classList.remove('hide');
    window['QRScanner'].destroy();
  }

  ionViewCanEnter() {
    if (window['QRScanner']) {
      return true;
    } else {
      return false;
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad QrscannerPage');
  }
}
