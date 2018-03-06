import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BarcodeScanner } from '@ionic-native/barcode-scanner';

/*
  Generated class for the QrProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class QrProvider {

  private barcodeMajor: any;
  private barcodeMinor: any;

  constructor(public http: HttpClient,
    private barcodeScanner: BarcodeScanner) {
    console.log('Hello QrProvider Provider');

  }

  getScannedTagId() {
    return {
      "major": this.barcodeMajor,
      "minor": this.barcodeMinor
    }
  }

  scan() {
    return new Promise((resolve, reject) => {
      this.barcodeScanner.scan({
        preferFrontCamera: false, // iOS and Android
        showFlipCameraButton: true, // iOS and Android
        showTorchButton: true, // iOS and Android
        torchOn: true, // Android, launch with the torch switched on (if available)
        prompt: "Place a barcode inside the scan area", // Android
        resultDisplayDuration: 500, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
        formats: "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
        //orientation : "landscape", // Android only (portrait|landscape), default unset so it rotates with the device
        disableAnimations: true, // iOS
        disableSuccessBeep: false // iOS and Android
      }).then((barcodeData) => {
        console.log(JSON.stringify(barcodeData));
        var res = barcodeData.text.split(',');

        if (barcodeData.format == "QR_CODE" &&
          res[0] == "Huan") {
          console.log("Huan Barcode detected");

          this.barcodeMajor = res[1];
          this.barcodeMinor = res[2];

          resolve(true);
        } else {
          console.error("Incompatible Barcode scanned");
        }
      }, (err) => {
        console.error(err);
        reject(err);
      },
      );
    })
  }

}
