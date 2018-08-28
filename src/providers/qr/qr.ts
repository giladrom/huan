import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BarcodeScanner } from '@ionic-native/barcode-scanner';
import { UtilsProvider } from '../utils/utils';

@Injectable()
export class QrProvider {
  private barcodeMajor: any;
  private barcodeMinor: any;

  constructor(
    public http: HttpClient,
    private barcodeScanner: BarcodeScanner,
    private utilsProvider: UtilsProvider
  ) {}

  getScannedTagId() {
    return {
      major: this.barcodeMajor,
      minor: this.barcodeMinor
    };
  }

  scan() {
    return new Promise((resolve, reject) => {
      this.barcodeScanner
        .scan({
          preferFrontCamera: false, // iOS and Android
          showFlipCameraButton: false, // iOS and Android
          showTorchButton: false, // iOS and Android
          torchOn: false, // Android, launch with the torch switched on (if available)
          prompt: 'Place the Huan tag inside the scan area', // Android
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

              if (barcodeData.format == 'QR_CODE' && text[5].length === 4) {
                console.log('Huan Barcode detected');

                // Hardcode this for now
                // FIXME: Needs to be put into the QRCode
                this.barcodeMajor = 1;

                // Return padded minor
                this.barcodeMinor = this.utilsProvider.pad(text[5], 4, '0');

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
}
