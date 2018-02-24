import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BLE } from '@ionic-native/ble';
import { Platform } from 'ionic-angular';
import { TagProvider } from '../../providers/tag/tag';

/*
  Generated class for the BleProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class BleProvider {

  constructor(public http: HttpClient,
    private ble: BLE,
    platform: Platform,
    tag: TagProvider) {
    console.log('Hello BleProvider Provider');

    platform.ready().then(() => {
      console.log("Scanning for tags...");

      this.ble.startScanWithOptions([], { reportDuplicates: false }).subscribe(device => {
        console.log("Found BLE device: " + device.id);
        if (device.advertising.kCBAdvDataServiceData !== undefined) {
          if (device.advertising.kCBAdvDataServiceData.FEAA !== undefined) {
            // Verified this is indeed an Eddystone Beacon

            var beaconUrl = this.parseEddystoneURL(device.advertising.kCBAdvDataServiceData.FEAA);
            var tagId = this.parseHuanTagId(beaconUrl);
            console.log("Beacon URL: " + beaconUrl);
            console.log("Huan Tag ID: " + tagId);

            tag.updateTagLastSeen(tagId);
          }
        }

        console.log("-------------------------------------------------");
      });


    })


    /*    
    setTimeout(ble.stopScan,
        5000,
        function() { console.log("Scan complete"); },
        function() { console.log("stopScan failed"); }
    );
    */
  }

  parseHuanTagId(url) {
    var tagId = url.slice(url.lastIndexOf('/') + 1);

    return tagId;
  }

  // Parse Eddystone URL according to Google's specs
  parseEddystoneURL(rawdata) {
    var postfix = [
      ".com/",
      ".org/",
      ".edu/",
      ".net/",
      ".info/",
      ".biz/",
      ".gov/",
      ".com",
      ".org",
      ".edu",
      ".net",
      ".info",
      ".biz",
      ".gov"
    ];

    var url = '';
    var txpower = 0;

    var data = new Uint8Array(rawdata);

    switch (data[0]) {
      case 0x00: //UID
        break;
      case 0x10: //URL
        txpower = data[1];

        switch (data[2]) {
          case 0x00:
            url = 'http://www.';
            break;
          case 0x01:
            url = 'https://www.';
            break;
          case 0x02:
            url = 'http://';
            break;
          case 0x03:
            url = 'https://';
            break;
        }

        var i = 3;

        while (i < data.length) {
          if (data[i] <= 13) {
            url += postfix[data[i]];
          }

          if (data[i] > 32 && data[i] < 127) {
            url += String.fromCharCode(data[i]);
          }
          
          i++;
        }

        break;
      case 0x20: //TLM
        break;
      case 0x30: //EID
        break;
    }

    return url;
  }

  stringToBytes(string) {
    var array = new Uint8Array(string.length);
    for (var i = 0, l = string.length; i < l; i++) {
      array[i] = string.charCodeAt(i);
    }
    return array.buffer;
  }

  bytesToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }
}
