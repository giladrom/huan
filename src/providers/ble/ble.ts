import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BLE } from '@ionic-native/ble';
import { Platform } from 'ionic-angular';
import { TagProvider } from '../../providers/tag/tag';

import { IBeacon } from '@ionic-native/ibeacon';
//import { LocalNotifications } from '@ionic-native/local-notifications';

declare let cordova: any;

/*
  Generated class for the BleProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class BleProvider {

  constructor(public http: HttpClient,
    private ble: BLE,
    public ibeacon: IBeacon,
    platform: Platform,
    public tag: TagProvider,
    /*private localNotifications: LocalNotifications*/) {

    console.log('Hello BleProvider Provider');

    platform.ready().then(() => {
      //cordova.plugins.notification.local.requestPermission();
      /*
            console.log("Scanning for Eddystone tags...");
            this.scanEddystone();
      */

      console.log("Scanning for iBeacon tags...");

      this.scanIBeacon();

    })
  }

  scanIBeacon() {

    let beaconRegion = this.ibeacon.BeaconRegion(
      'HuanBeacon',
      '2D893F67-E52C-4125-B66F-A80473C408F2',
      undefined,
      undefined,
      true);

    // Request permission to use location on iOS - required for background scanning
    this.ibeacon.requestAlwaysAuthorization().then(() => {
      console.log("Enabled Always Location Authorization");
    }).catch(error => {
      console.log("ERROR: " + error);
    })

    // create a new delegate and register it with the native layer
    let delegate = this.ibeacon.Delegate();

    // Subscribe to some of the delegate's event handlers
    delegate.didRangeBeaconsInRegion()
      .subscribe(
        data => {
          console.log('didRangeBeaconsInRegion: ', JSON.stringify(data))
          if (data.beacons.length > 0) {
            data.beacons.forEach(beacon => {
              console.log("Major/Minor: " + beacon.major + "/" + beacon.minor);
              this.tag.updateTagLastSeen(beacon.minor);
              this.tag.updateTagLocation(beacon.minor);
            });
          }
        },
        error => console.error()
      );
    delegate.didStartMonitoringForRegion()
      .subscribe(
        data => console.log('didStartMonitoringForRegion: ', JSON.stringify(data)),
        error => console.error()
      );

    /*
    //XXX Uncomment for testing purposes only
    this.ibeacon.startRangingBeaconsInRegion(beaconRegion).then(() => {
      console.log("Ranging initiated...");
    });
    //XXX
    */
    delegate.didEnterRegion()
      .subscribe(
        data => {
          console.log('didEnterRegion: ' + JSON.stringify(data));

          this.ibeacon.startRangingBeaconsInRegion(beaconRegion).then(() => {
            console.log("Ranging initiated...");
          });

          /*
          this.localNotifications.schedule({
            id: 1,
            text: 'Tag Detected',
          });
          */
        }
      );
    delegate.didExitRegion()
      .subscribe(
        data => {
          console.log('didExitRegion: ', JSON.stringify(data));
          this.ibeacon.stopRangingBeaconsInRegion(beaconRegion).then(() => {
            console.log("Ranging stopped.");
          });

          /*
          this.localNotifications.schedule({
            id: 1,
            text: 'No Tags in range',
          });
          */

        }
      );


    this.ibeacon.requestStateForRegion(beaconRegion).then(() => {
      console.log("Requested State for Region");
    });

    this.ibeacon.startMonitoringForRegion(beaconRegion)
      .then(
        () => console.log('Native layer received the request to monitoring'),
        error => console.error('Native layer failed to begin monitoring: ', error)
      );
  }

  scanEddystone() {
    this.ble.startScanWithOptions(
      // Specify the Beacon UUID to enable Background BLE operation
      ['0000FEAA-0000-1000-8000-00805F9B34FB'],
      // Set reportDuplicates to make sure we monitor the same tag 
      { reportDuplicates: false }
    ).subscribe(device => {
      // Only update timestamp every 1000 iterations since currently the 
      // Bluefruit has a very short interval

      console.log("Found BLE device: " + JSON.stringify(device));
      if (device.advertising.kCBAdvDataServiceData !== undefined) {
        if (device.advertising.kCBAdvDataServiceData.FEAA !== undefined) {
          // Verified this is indeed an Eddystone Beacon

          //console.log(this.bytesToString(device.advertising.kCBAdvDataServiceData.FEAA));
          var beaconUrl = this.parseEddystoneURL(device.advertising.kCBAdvDataServiceData.FEAA);
          var tagId = this.parseHuanTagId(beaconUrl);
          console.log("Beacon URL: " + beaconUrl);
          console.log("Huan Tag ID: " + tagId);

          this.tag.updateTagLastSeen(tagId);
          // Update tag location
        }
      }

      //console.log("-------------------------------------------------");
    });
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
