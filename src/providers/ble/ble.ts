import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BLE } from '@ionic-native/ble';
import {
  Platform
  // Ion
} from 'ionic-angular';
import { TagProvider } from '../../providers/tag/tag';

import { IBeacon, Beacon } from '@ionic-native/ibeacon';
import { NotificationProvider } from '../notification/notification';
import { SettingsProvider, Settings } from '../settings/settings';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';
import { resolve } from 'dns';
import { IsDebug } from '../../../node_modules/@ionic-native/is-debug';

@Injectable()
export class BleProvider {
  private tags$: any;
  private tagUpdatedTimestamp = {};
  private beaconRegion;
  private scanningEnabled: boolean;
  private settings: Settings;

  private tagArray: Array<any>;
  private devel;

  rl_beacon = {
    service: '00001803-494C-4F47-4943-544543480000',
    read_uuid: '00001804-494C-4F47-4943-544543480000',
    write_uuid: '00001805-494C-4F47-4943-544543480000'
  };

  private bluetooth_enabled: BehaviorSubject<any>;

  constructor(
    public http: HttpClient,
    private ble: BLE,
    public ibeacon: IBeacon,
    private platform: Platform,
    public tag: TagProvider,
    public notification: NotificationProvider,
    private settingsProvider: SettingsProvider,
    private isDebug: IsDebug
  ) {
    this.scanningEnabled = false;
    // this.tags$ = new Subject<Beacon[]>();

    this.bluetooth_enabled = new BehaviorSubject<any>(1);

    this.platform.ready().then(() => {
      this.isDebug.getIsDebug().then(dbg => {
        this.devel = dbg;
      });

      setInterval(() => {
        this.ble
          .isEnabled()
          .then(() => {
            this.bluetooth_enabled.next(true);
          })
          .catch(() => {
            this.bluetooth_enabled.next(false);
          });
      }, 1000);
    });
  }

  getBluetoothStatus() {
    return this.bluetooth_enabled;
  }

  stopScan() {
    this.ble
      .stopScan()
      .then(() => {
        console.log('BLEProvider: Stopping scan');
      })
      .catch(e => {
        console.error('BLEProvider: ' + e);
      });

    this.tags$.complete();
  }

  startScan() {
    this.tags$ = new BehaviorSubject(1);
    this.tagArray = new Array();

    console.log('BLEProvider: Initializing scan');

    this.ble.startScan([]).subscribe(device => {
      console.log('*** BLE Scan found device: ' + JSON.stringify(device));

      let name = new String(device.advertising.kCBAdvDataLocalName);
      if (name.includes('Tag ') || (this.devel && name.includes('Radioland'))) {
        console.log('Tag Detected! Name: ' + name);

        this.getTagInfo(device.id).then(info => {
          this.tagArray.push({ device, info });
          this.tags$.next(this.tagArray);
        });
      }
    });
  }

  updateTagInfo(device_id) {
    return new Promise((resolve, reject) => {
      this.ble.connect(device_id).subscribe(data => {
        console.log(`Connected to ${data.name}`);

        this.setTagInterval(device_id)
          .then(data => {
            console.log('Successfully updated interval');

            this.ble.disconnect(device_id).then(() => {
              console.log('Disconnected from ' + device_id);
            });

            resolve(data);
          })
          .catch(e => {
            reject(e);
          });
      });
    });
  }

  getTagInfo(device_id) {
    return new Promise((resolve, reject) => {
      this.ble.connect(device_id).subscribe(data => {
        console.log(`Connected to ${data.name}`);

        var info = {};

        this.getTagUUID(device_id).then(uuid => {
          console.log(`${name} UUID: ` + uuid);

          this.getTagParams(device_id).then(params => {
            console.log(`${name} Major: ` + params.major);
            console.log(`${name} Minor: ` + params.minor);
            console.log(`${name} Batt: ` + params.batt);

            this.ble.disconnect(device_id).then(() => {
              console.log('Disconnected from ' + device_id);
            });

            resolve({
              name: data.advertising.kCBAdvDataLocalName,
              uuid: uuid,
              major: params.major,
              minor: params.minor,
              batt: params.batt,
              id: device_id,
              rssi: data.rssi
            });
          });
        });
      });
    });
  }

  programTag(device_id, major, minor) {
    return new Promise((resolve, reject) => {
      this.ble.connect(device_id).subscribe(data => {
        console.log(`Connected to ${data.name}`);

        console.log(JSON.stringify(data));

        var info = {};

        this.setTagName(device_id, 'Tag ' + minor).then(() => {
          this.setTagUUID(device_id).then(() => {
            this.setTagInterval(device_id).then(() => {
              this.setTagParams(device_id, major, minor).then(params => {
                this.ble.disconnect(device_id).then(() => {
                  console.log('Disconnected from ' + device_id);

                  this.tagArray.forEach(element => {
                    console.log(
                      'ELEMENT: ' + JSON.stringify(element.device.id)
                    );

                    if (element.device.id === device_id) {
                      this.tagArray.splice(this.tagArray.indexOf(element), 1);
                    }
                  });
                  resolve(true);
                });
              });
            });
          });
        });
      });
    });
  }

  getTagUUID(device_id): Promise<any> {
    return new Promise((resolve, reject) => {
      var uuid_read = new Uint8Array(1);
      uuid_read[0] = 0x13;

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          uuid_read.buffer
        )
        .then(data => {
          this.ble
            .read(device_id, this.rl_beacon.service, this.rl_beacon.read_uuid)
            .then(data => {
              let buf = new Uint8Array(data);

              var uuid = '';
              for (var i = 1; i < buf.length; i++) {
                uuid += buf[i].toString(16);
              }

              resolve(uuid);
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  setTagUUID(device_id): Promise<any> {
    return new Promise((resolve, reject) => {
      var uuid_write = new Uint8Array(17);
      // Write command
      uuid_write[0] = 0x12;

      // Huan BLE UUID
      uuid_write[1] = 0x2d;
      uuid_write[2] = 0x89;
      uuid_write[3] = 0x3f;
      uuid_write[4] = 0x67;
      uuid_write[5] = 0xe5;
      uuid_write[6] = 0x2c;
      uuid_write[7] = 0x41;
      uuid_write[8] = 0x25;
      uuid_write[9] = 0xb6;
      uuid_write[10] = 0x6f;
      uuid_write[11] = 0xa8;
      uuid_write[12] = 0x04;
      uuid_write[13] = 0x73;
      uuid_write[14] = 0xc4;
      uuid_write[15] = 0x08;
      uuid_write[16] = 0xf2;

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          uuid_write.buffer
        )
        .then(data => {
          console.log('setTagUUID: Completed: ' + JSON.stringify(data));

          resolve(data);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  setTagName(device_id, name: String): Promise<any> {
    return new Promise((resolve, reject) => {
      var name_write = new Uint8Array(9);
      name_write[0] = 0x11;

      for (var i = 0; i < 8; i++) {
        name_write[i + 1] = name.charCodeAt(i);
      }

      console.log(`Setting tag name to ${name}: ` + JSON.stringify(name_write));

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          name_write.buffer
        )
        .then(data => {
          console.log('setTagName: Completed: ' + JSON.stringify(data));
          resolve(data);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  setTagParams(
    device_id,
    major: number,
    minor: number,
    batt: number = 100
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      var params_write = new Uint8Array(6);
      params_write[0] = 0x14;
      params_write[1] = (major & 0xff00) >> 8;
      params_write[2] = major & 0x00ff;
      params_write[3] = (minor & 0xff00) >> 8;
      params_write[4] = minor & 0x00ff;
      params_write[5] = batt;

      console.log('Setting tag params: ' + JSON.stringify(params_write));

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          params_write.buffer
        )
        .then(data => {
          console.log('setTagParams: Completed: ' + JSON.stringify(data));
          resolve(data);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  getTagParams(device_id): Promise<any> {
    return new Promise((resolve, reject) => {
      var params_read = new Uint8Array(1);
      params_read[0] = 0x15;

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          params_read.buffer
        )
        .then(data => {
          this.ble
            .read(device_id, this.rl_beacon.service, this.rl_beacon.read_uuid)
            .then(data => {
              let buf = new Uint8Array(data);

              console.log(JSON.stringify(buf));

              let major: number = (buf[1] << 8) | buf[2];
              let minor: number = (buf[3] << 8) | buf[4];

              var params = {
                major: major,
                minor: minor,
                batt: buf[5].toString()
              };

              resolve(params);
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  setTagInterval(device_id) {
    return new Promise((resolve, reject) => {
      // Set interval to 2000 ms
      var params_write = new Uint8Array(2);
      params_write[0] = 0x16;
      params_write[1] = 0x28;

      this.ble
        .write(
          device_id,
          this.rl_beacon.service,
          this.rl_beacon.write_uuid,
          params_write.buffer
        )
        .then(data => {
          console.log('Write command returned: ' + JSON.stringify(data));
          resolve(data);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }

  init() {
    console.log('BleProvider: Initializing...');

    let settingsLoaded$ = new ReplaySubject(1);

    this.platform.ready().then(() => {
      console.log('BleProvider: init(): Scanning for iBeacon tags...');

      this.ibeacon.getMonitoredRegions().then(regions => {
        regions.forEach(region => {
          console.log('Currently monitoring: ' + JSON.stringify(region));
        });
      });

      this.settingsProvider.getSettings().subscribe(settings => {
        if (settings) {
          this.settings = settings;
          settingsLoaded$.next(true);
          settingsLoaded$.complete();
        }
      });

      settingsLoaded$.subscribe(() => {
        console.log(
          'BleProvider: Received settings data, initializing tag scan: ' +
            JSON.stringify(this.settings)
        );
        this.scanningEnabled = true;

        this.scanIBeacon();
      });
    });
  }

  stop() {
    console.log('BleProvider: Shutting Down...');

    if (this.scanningEnabled) {
      this.disableMonitoring();

      this.ibeacon
        .stopMonitoringForRegion(this.beaconRegion)
        .then(
          () =>
            console.log('Native layer received the request to stop monitoring'),
          error =>
            console.error('Native layer failed to stop monitoring: ', error)
        );

      this.scanningEnabled = false;
    }
  }

  enableMonitoring() {
    this.ibeacon
      .startRangingBeaconsInRegion(this.beaconRegion)
      .then(() => {
        console.log('BleProvider: Enabled Beacon Monitoring');

        this.scanningEnabled = true;
      })
      .catch(error => {
        console.error('Unable to start Monitoring: ' + JSON.stringify(error));
      });
  }

  disableMonitoring() {
    this.ibeacon.stopRangingBeaconsInRegion(this.beaconRegion).then(() => {
      console.log('BleProvider: Disabled Beacon Monitoring');
    });

    // this.tags$.next(new Array<Beacon[]>());

    // this.tags$.complete();
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

    delegate
      .didStartMonitoringForRegion()
      .subscribe(
        data =>
          console.log('didStartMonitoringForRegion: ', JSON.stringify(data)),
        error => console.error(error)
      );

    delegate.didDetermineStateForRegion().subscribe(data => {
      console.log('didDetermineStateForRegion: ' + JSON.stringify(data));

      if (this.settings.enableMonitoring) {
        this.ibeacon.startRangingBeaconsInRegion(this.beaconRegion).then(() => {
          console.log('didDetermineStateForRegion: Ranging initiated...');
        });
      }
    });

    delegate.didEnterRegion().subscribe(data => {
      console.log('didEnterRegion: ' + JSON.stringify(data));

      if (this.settings.regionNotifications) {
        this.notification.sendLocalNotification(
          'Huan tag detected nearby!',
          'Initiating Ranging'
        );
      }

      // this.tags$.next(new Array<Beacon[]>());

      if (this.settings.enableMonitoring) {
        this.ibeacon.startRangingBeaconsInRegion(this.beaconRegion).then(() => {
          console.log('didEnterRegion: Ranging initiated...');
        });
      }
    });

    // Beacons were detected - update database timestamp and location
    let unsubscribe = delegate.didRangeBeaconsInRegion().subscribe(
      data => {
        // TODO: Minimize energy usage by only ranging for a few seconds
        // this.ibeacon.stopRangingBeaconsInRegion(this.beaconRegion).then(() => {
        //   console.log('### Ranging stopped.');
        //   this.disableMonitoring();
        // });

        // Prepare an Observable for the TagList page to consume
        // this.tags$.next(data.beacons.sort((a, b) => a.minor - b.minor));

        // console.log('didRangeBeaconsInRegion: ', JSON.stringify(data));
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
      error => console.error(error)
    );

    delegate.didExitRegion().subscribe(data => {
      console.log('didExitRegion: ', JSON.stringify(data));

      // this.tags$.next(new Array<Beacon[]>());

      if (this.settings.regionNotifications) {
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

  getTags(): Subject<any> {
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
