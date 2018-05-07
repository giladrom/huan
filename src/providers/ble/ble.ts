import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BLE } from '@ionic-native/ble';
import {
  Platform
  // Ion
} from 'ionic-angular';
import { TagProvider } from '../../providers/tag/tag';

import {
  IBeacon,
  Beacon
} from '@ionic-native/ibeacon';
import { NotificationProvider } from '../notification/notification';
import { SettingsProvider, Settings } from '../settings/settings';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';

@Injectable()
export class BleProvider {
  tags$: Observable<Beacon[]>;
  private tagUpdatedTimestamp = {};
  private beaconRegion;

  private set: Settings;

  constructor(
    public http: HttpClient,
    private ble: BLE,
    public ibeacon: IBeacon,
    private platform: Platform,
    public tag: TagProvider,
    public notification: NotificationProvider,
    private settings: SettingsProvider
  ) {
    console.log('Hello BleProvider Provider');
  }

  init() {
    this.platform.ready().then(() => {
      console.log('BleProvider: init(): Scanning for iBeacon tags...');

      this.ibeacon.getMonitoredRegions().then(regions => {
        regions.forEach(region => {
          console.log('Currently monitoring: ' + JSON.stringify(region));
        });
      });

      this.settings
        .getSettings()
        .then(data => {
          this.set = data;

          console.log(
            'BleProvider: Received settings data, initializing tag scan: ' +
              JSON.stringify(this.set)
          );
          this.scanIBeacon();
        })
        .catch(error => {
          console.error(
            'BleProvider: Did not receive settings data: ' +
              JSON.stringify(error)
          );
        });
    });
  }

  stop() {
    this.disableMonitoring();

    this.ibeacon
      .stopMonitoringForRegion(this.beaconRegion)
      .then(
        () =>
          console.log('Native layer received the request to stop monitoring'),
        error =>
          console.error('Native layer failed to stop monitoring: ', error)
      );
  }

  enableMonitoring() {
    this.ibeacon
      .startRangingBeaconsInRegion(this.beaconRegion)
      .then(() => {
        console.log('BleProvider: Enabled Beacon Monitoring');
      })
      .catch(error => {
        console.error('Unable to start Monitoring: ' + JSON.stringify(error));
      });
  }

  disableMonitoring() {
    this.ibeacon.stopRangingBeaconsInRegion(this.beaconRegion).then(() => {
      console.log('BleProvider: Disabled Beacon Monitoring');
    });

    this.tags$ = Observable.of();
  }

  updateTag(tagId) {
    this.tag.updateTagData(tagId);
    this.tagUpdatedTimestamp[tagId] = Date.now();
  }

  scanIBeacon() {
    this.beaconRegion = this.ibeacon.BeaconRegion(
      'HuanBeacon',
      '2D893F67-E52C-4125-B66F-A80473C408F2',
      0x0001,
      undefined,
      true
    );

    // Request permission to use location on iOS - required for background scanning
    this.ibeacon
      .requestAlwaysAuthorization()
      .then(() => {
        console.log('Enabled Always Location Authorization');
      })
      .catch(error => {
        console.log('Unable to enable location authorization: ' + error);
      });

    // create a new delegate and register it with the native layer
    let delegate = this.ibeacon.Delegate();

    // Subscribe to some of the delegate's event handlers
    delegate.didRangeBeaconsInRegion().subscribe(
      data => {
        // Prepare an Observable for the TagList page to consume
        this.tags$ = Observable.of(
          data.beacons.sort((a, b) => a.minor - b.minor)
        );

        //console.log('didRangeBeaconsInRegion: ', JSON.stringify(data))
        if (data.beacons.length > 0) {
          var utc = Date.now();

          data.beacons.forEach(beacon => {
            if (!this.tagUpdatedTimestamp[beacon.minor]) {
              this.tagUpdatedTimestamp[beacon.minor] = 0;
            }

            if (utc - this.tagUpdatedTimestamp[beacon.minor] > 30000) {
              this.updateTag(beacon.minor);
            }
          });
        }
      },
      error => console.error()
    );
    delegate
      .didStartMonitoringForRegion()
      .subscribe(
        data =>
          console.log('didStartMonitoringForRegion: ', JSON.stringify(data)),
        error => console.error()
      );

    delegate.didDetermineStateForRegion().subscribe(data => {
      console.log('didDetermineStateForRegion: ' + JSON.stringify(data));

      if (this.set.enableMonitoring) {
        this.ibeacon.startRangingBeaconsInRegion(this.beaconRegion).then(() => {
          console.log('didDetermineStateForRegion: Ranging initiated...');
        });
      }
    });

    delegate.didEnterRegion().subscribe(data => {
      console.log('didEnterRegion: ' + JSON.stringify(data));

      if (this.set.regionNotifications) {
        this.notification.sendLocalNotification(
          'Huan tag detected nearby!',
          'Initiating Ranging'
        );
      }

      if (this.set.enableMonitoring) {
        this.ibeacon.startRangingBeaconsInRegion(this.beaconRegion).then(() => {
          console.log('didEnterRegion: Ranging initiated...');
        });
      }
    });
    delegate.didExitRegion().subscribe(data => {
      console.log('didExitRegion: ', JSON.stringify(data));

      if (this.set.regionNotifications) {
        this.notification.sendLocalNotification(
          'No tags detected',
          'Ranging stopped'
        );
      }

      this.ibeacon.stopRangingBeaconsInRegion(this.beaconRegion).then(() => {
        console.log('Ranging stopped.');
      });
    });

    // This returns an error on Android
    if (this.platform.is('ios')) {
      this.ibeacon.requestStateForRegion(this.beaconRegion).then(() => {
        console.log('Requested State for Region');
      });
    }

    this.ibeacon
      .startMonitoringForRegion(this.beaconRegion)
      .then(
        () => console.log('Native layer received the request for monitoring'),
        error =>
          console.error('Native layer failed to begin monitoring: ', error)
      );
  }

  scanEddystone() {
    this.ble
      .startScanWithOptions(
        // Specify the Beacon UUID to enable Background BLE operation
        ['0000FEAA-0000-1000-8000-00805F9B34FB'],
        // Set reportDuplicates to make sure we monitor the same tag
        { reportDuplicates: false }
      )
      .subscribe(device => {
        // Only update timestamp every 1000 iterations since currently the
        // Bluefruit has a very short interval

        console.log('Found BLE device: ' + JSON.stringify(device));
        if (device.advertising.kCBAdvDataServiceData !== undefined) {
          if (device.advertising.kCBAdvDataServiceData.FEAA !== undefined) {
            // Verified this is indeed an Eddystone Beacon

            //console.log(this.bytesToString(device.advertising.kCBAdvDataServiceData.FEAA));
            var beaconUrl = this.parseEddystoneURL(
              device.advertising.kCBAdvDataServiceData.FEAA
            );
            var tagId = this.parseHuanTagId(beaconUrl);
            console.log('Beacon URL: ' + beaconUrl);
            console.log('Huan Tag ID: ' + tagId);

            this.tag.updateTagLastSeen(tagId);
            // Update tag location
          }
        }

        //console.log("-------------------------------------------------");
      });
  }

  getTags(): Observable<Beacon[]> {
    return this.tags$;
  }

  parseHuanTagId(url) {
    var tagId = url.slice(url.lastIndexOf('/') + 1);

    return tagId;
  }

  // Parse Eddystone URL according to Google's specs
  parseEddystoneURL(rawdata) {
    var postfix = [
      '.com/',
      '.org/',
      '.edu/',
      '.net/',
      '.info/',
      '.biz/',
      '.gov/',
      '.com',
      '.org',
      '.edu',
      '.net',
      '.info',
      '.biz',
      '.gov'
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
