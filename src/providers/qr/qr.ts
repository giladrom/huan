import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { ModalController, Modal, Platform } from 'ionic-angular';

import { UtilsProvider } from '../utils/utils';
import { Toast } from '@ionic-native/toast';

@Injectable()
export class QrProvider {
  private barcodeMajor: any;
  private barcodeMinor: any;
  protected modal: Modal;

  constructor(
    public http: HttpClient,
    private barcodeScanner: BarcodeScanner,
    private qrScanner: QRScanner,
    private utilsProvider: UtilsProvider,
    private toast: Toast,
    protected modalController: ModalController,
    private platform: Platform
  ) {}

  getScannedTagId() {
    return {
      major: this.barcodeMajor,
      minor: this.barcodeMinor
    };
  }

  scan(
    validate: (text: any) => any = text => {
      return text;
    }
  ): Promise<any> {
    this.modal = this.modalController.create('QRScannerPage', {
      validate: validate
    });
    this.modal.present();

    return new Promise<any>((resolve, reject) => {
      this.modal.onDidDismiss(data => {
        if (data && data.text) {
          if (data.text.includes('https://gethuan.com/#/t')) {
            // New QRCode format
            var text = data.text.split('/');

            console.log(JSON.stringify(text));

            if (text[5].length >= 4) {
              console.log('Huan Barcode detected');

              // Hardcode this for now
              // FIXME: Needs to be put into the QRCode
              this.barcodeMajor = 1;

              // Return padded minor
              var minor = text[5].split(',')[0];
              console.log('minor', minor);
              this.barcodeMinor = this.utilsProvider.pad(minor, 4, '0');

              resolve(true);
            }
          }

          reject();
        } else {
          reject();
        }
      });
    });
  }

  async scanBarcode() {
    return new Promise((resolve, reject) => {
      this.barcodeScanner
        .scan({
          preferFrontCamera: false, // iOS and Android
          showFlipCameraButton: false, // iOS and Android
          showTorchButton: true, // iOS and Android
          torchOn: true, // Android, launch with the torch switched on (if available)
          prompt: 'Place the QR code inside the scan area', // Android
          resultDisplayDuration: 0, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
          formats: 'QR_CODE,PDF_417', // default: all but PDF_417 and RSS_EXPANDED
          //orientation : "landscape", // Android only (portrait|landscape), default unset so it rotates with the device
          disableAnimations: true, // iOS
          disableSuccessBeep: false // iOS and Android
        })
        .then(
          barcodeData => {
            console.log(JSON.stringify(barcodeData));
            if (barcodeData.text.includes('https://gethuan.com/#/t')) {
              // New QRCode format
              var text = barcodeData.text.split('/');

              console.log(JSON.stringify(text));

              if (barcodeData.format == 'QR_CODE' && text[5].length >= 4) {
                console.log('Huan Barcode detected');

                // Hardcode this for now
                // FIXME: Needs to be put into the QRCode
                this.barcodeMajor = 1;

                // Return padded minor
                var minor = text[5].split(',')[0];
                console.log('minor', minor);
                this.barcodeMinor = this.utilsProvider.pad(minor, 4, '0');

                resolve(true);
              } else {
                console.error('Incompatible Barcode scanned');
                reject('Incompatible Barcode scanned.');
              }
            } else if (barcodeData.text.includes('Huan,')) {
              // Old QRCode format

              var res = barcodeData.text.split(',');

              if (barcodeData.format == 'QR_CODE' && res[0] == 'Huan') {
                console.log('Huan Barcode detected');

                this.barcodeMajor = res[1];

                // Return padded minor
                this.barcodeMinor = this.utilsProvider.pad(res[2], 4, '0');

                resolve(true);
              } else {
                console.error('Incompatible Barcode scanned');
                reject('Incompatible Barcode scanned.');
              }
            } else {
              console.error('Incompatible Barcode scanned');
              reject('Incompatible Barcode scanned.');
            }
          },
          err => {
            console.error(err);
            reject(err);
          }
        );
    });
  }

  showCamera() {
    (window.document.querySelector('ion-app') as HTMLElement).classList.add(
      'cameraView'
    );

    (window.document.querySelector('ion-content') as HTMLElement).classList.add(
      'cameraView'
    );
  }

  hideCamera() {
    (window.document.querySelector('ion-app') as HTMLElement).classList.remove(
      'cameraView'
    );

    (window.document.querySelector(
      'ion-content'
    ) as HTMLElement).classList.remove('cameraView');
  }

  async scanQR() {
    // await this.utilsProvider.displayAlertWithPromise(
    //   'Please point your camera at the QR code on the Tag.'
    // );

    return new Promise((resolve, reject) => {
      this.qrScanner
        .prepare()
        .then((status: QRScannerStatus) => {
          if (status.authorized) {
            // camera permission was granted

            const ionApp = <HTMLElement>(
              document.getElementsByTagName('ion-app')[0]
            );

            const closeButton = <HTMLElement>(
              document.getElementById('close-scanner-button')
            );

            let timeout = setTimeout(() => {
              console.log('Scanning timeout', JSON.stringify(status));

              this.qrScanner.getStatus().then((status: QRScannerStatus) => {
                if (status.previewing) {
                  this.qrScanner.hide(); // hide camera preview
                  scanSub.unsubscribe(); // stop scanning

                  this.hideCamera();

                  closeButton.style.display = 'none';

                  this.toast
                    .showWithOptions({
                      message: 'Scanner timed out',
                      duration: 3500,
                      position: 'center'
                    })
                    .subscribe(toast => {
                      console.log(JSON.stringify(toast));
                    });
                }
              });
            }, 5000);

            // start scanning
            let scanSub = this.qrScanner
              .scan()
              .subscribe((barcodeData: string) => {
                console.log(JSON.stringify(barcodeData));

                this.qrScanner.hide(); // hide camera preview
                // this.qrScanner.pausePreview();

                scanSub.unsubscribe(); // stop scanning

                this.hideCamera();

                if (barcodeData.includes('https://gethuan.com/#/t')) {
                  // New QRCode format
                  var text = barcodeData.split('/');

                  console.log(JSON.stringify(text));

                  if (text[5].length >= 4) {
                    console.log('Huan Barcode detected');

                    // Hardcode this for now
                    // FIXME: Needs to be put into the QRCode
                    this.barcodeMajor = 1;

                    // Return padded minor
                    var minor = text[5].split(',')[0];
                    console.log('minor', minor);
                    this.barcodeMinor = this.utilsProvider.pad(minor, 4, '0');

                    clearTimeout(timeout);
                    resolve(true);
                  } else {
                    this.qrScanner.hide(); // hide camera preview
                    scanSub.unsubscribe(); // stop scanning
                    this.hideCamera();

                    clearTimeout(timeout);

                    console.error('Incompatible Barcode scanned');
                    reject('Incompatible Barcode scanned.');
                  }
                } else {
                  this.qrScanner.hide(); // hide camera preview
                  scanSub.unsubscribe(); // stop scanning
                  this.hideCamera();

                  clearTimeout(timeout);

                  console.error('Incompatible Barcode scanned');
                  reject('Incompatible Barcode scanned.');
                }
              });

            // show camera preview
            this.showCamera();
            closeButton.style.display = 'block';

            this.qrScanner.show();
          } else if (status.denied) {
            this.utilsProvider.displayAlertWithPromise(
              'Please allow Camera permissions to scan Huan tags.'
            );

            console.error('QRSCanner: Permission Denied');
            // camera permission was permanently denied
            // you must use QRScanner.openSettings() method to guide the user to the settings page
            // then they can grant the permission from there
          } else {
            this.utilsProvider.displayAlertWithPromise(
              'Please allow Camera permissions to scan Huan tags.'
            );

            console.error('QRSCanner: Permission Denied this time');

            // permission was denied, but not permanently. You can ask for permission again at a later time.
          }
        })
        .catch(e => {
          console.error('qrScanner.prepare', e);
          reject(e);
        });
    });
  }
}
