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
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';
import { resolve } from 'dns';
import { IsDebug } from '../../../node_modules/@ionic-native/is-debug';
import { rejects } from 'assert';
import { AuthProvider } from '../auth/auth';
import { ConditionalExpr } from '@angular/compiler';

@Injectable()
export class BleProvider {
  private tags$: any;
  private tagUpdatedTimestamp = {};
  private tagStatus = {};
  private beaconRegion;
  private scanningEnabled: boolean;
  private settings: Settings;

  private tagArray: Array<any>;
  private devel;

  private last_update = Date.now();

  rl_beacon = {
    service: '00001803-494C-4F47-4943-544543480000',
    read_uuid: '00001804-494C-4F47-4943-544543480000',
    write_uuid: '00001805-494C-4F47-4943-544543480000'
  };

  private bluetooth_enabled: BehaviorSubject<any>;
  private location_auth: BehaviorSubject<any>;

  private update_interval = 15000;

  constructor(
    public http: HttpClient,
    private ble: BLE,
    public ibeacon: IBeacon,
    private platform: Platform,
    public tag: TagProvider,
    public notification: NotificationProvider,
    private settingsProvider: SettingsProvider,
    private authProvider: AuthProvider,
    private isDebug: IsDebug
  ) {
    this.scanningEnabled = false;
    // this.tags$ = new Subject<Beacon[]>();

    this.bluetooth_enabled = new BehaviorSubject<any>(1);
    this.location_auth = new BehaviorSubject<any>(1);

    this.platform.ready().then(() => {
      // Set background/foreground modes for Android Beacon Plugin
      if (this.platform.is('android')) {
        this.platform.resume.subscribe(e => {
          console.info('BLE Provider: Foreground mode');
          this.ibeacon.foregroundMode();
        });

        this.platform.pause.subscribe(() => {
          console.info('BLE Provider: Background mode');
          this.ibeacon.backgroundMode();
        });
      }

      this.isDebug.getIsDebug().then(dbg => {
        this.devel = dbg;
      });

      let ble_int = setInterval(() => {
        this.ble
          .isEnabled()
          .then(() => {
            this.bluetooth_enabled.next(true);
          })
          .catch(() => {
            this.bluetooth_enabled.next(false);
          });
      }, 1000);

      if (this.platform.is('ios')) {
        let auth_int = setInterval(() => {
          this.ibeacon
            .getAuthorizationStatus()
            .then(auth => {
              if (
                auth.authorizationStatus !== 'AuthorizationStatusAuthorized'
              ) {
                console.warn('Auth Status:' + JSON.stringify(auth));
                this.location_auth.next(false);
              } else {
                this.location_auth.next(true);
              }
            })
            .catch(e => {
              console.error(e);
            });
        }, 1000);
      }
    });
  }

  setUpdateInterval(interval) {
    console.info('Setting BLE update interval to ' + interval);
    this.update_interval = interval;
  }

  getBluetoothStatus() {
    return this.bluetooth_enabled;
  }

  getAuthStatus() {
    return this.location_auth;
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
    this.tagArray = new Array();
    this.tags$ = new BehaviorSubject<Beacon[]>(this.tagArray);

    console.log('BLEProvider: Initializing scan');

    this.ble.startScan([]).subscribe(device => {
      console.log('*** BLE Scan found device: ' + JSON.stringify(device));

      var name: String;

      if (this.platform.is('ios')) {
        name = new String(device.advertising.kCBAdvDataLocalName);
      } else {
        name = new String(device.name);
      }

      if (name.includes('Huan-')) {
        console.log('Tag Detected! Name: ' + name);

        this.getTagInfo(device.id)
          .then(info => {
            this.tagArray.push({ device, info });
            this.tags$.next(this.tagArray);
          })
          .catch(e => {
            console.error('getTagInfo', e);
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
      console.log('Connecting to', device_id);

      this.ble.connect(device_id).subscribe(
        data => {
          console.log(`Connected to ${data.name}`);

          var info = {};

          this.getTagUUID(device_id)
            .then(uuid => {
              console.log(`${name} UUID: ` + uuid);

              this.getTagParams(device_id)
                .then(params => {
                  console.log(`${name} Major: ` + params.major);
                  console.log(`${name} Minor: ` + params.minor);

                  this.getTagBattLevel(device_id)
                    .then(batt => {
                      console.log(`${name} Batt: ` + batt);

                      this.ble.disconnect(device_id).then(() => {
                        console.log('Disconnected from ' + device_id);
                      });

                      resolve({
                        name: data.advertising.kCBAdvDataLocalName,
                        uuid: uuid,
                        major: params.major,
                        minor: params.minor,
                        batt: batt,
                        id: device_id,
                        rssi: data.rssi
                      });
                    })
                    .catch(e => {
                      reject(e);
                    });
                })
                .catch(e => {
                  reject(e);
                });
            })
            .catch(e => {
              reject(e);
            });
        },
        data => {
          console.error(
            `Unable to connect to ${device_id} : ` + JSON.stringify(data)
          );

          reject(data);
        }
      );
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
                minor: minor
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

  getTagBattLevel(device_id): Promise<any> {
    return new Promise((resolve, reject) => {
      var params_read = new Uint8Array(1);
      params_read[0] = 0x19;

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

              let batt = buf[0] & buf[1];

              console.log('getTagBattLeveL', JSON.stringify(batt));

              resolve(batt);
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

  setLocationManagerUid() {
    // Set UID for Android Beacon Plugin
    if (this.platform.is('android')) {
      this.authProvider
        .getUserId()
        .then(uid => {
          console.info('BLE Provider: Setting LocationManager UID to ' + uid);
          this.ibeacon.setUid(uid);
        })
        .catch(e => {
          console.error(
            'BLE Provider: Error setting LocationManager UID: ' + e
          );
        });
    }
  }

  init() {
    console.log('BleProvider: Initializing...');

    let settingsLoaded$ = new ReplaySubject(1);

    this.platform.ready().then(() => {
      this.setLocationManagerUid();

      console.log('BleProvider: init(): Scanning for iBeacon tags...');

      this.ibeacon.getMonitoredRegions().then(regions => {
        regions.forEach(region => {
          console.log('Currently monitoring: ' + JSON.stringify(region));
        });
      });

      this.settingsProvider.getSettings().subscribe(settings => {
        if (settings) {
          this.settings = settings;

          if (this.platform.is('android')) {
            if (this.settings.enableMonitoring) {
              this.ibeacon.enableMonitoring();

              this.ibeacon.setMonitoringFrequency(
                this.settings.monitoringFrequency
              );
            } else {
              this.ibeacon.disableMonitoring();
            }
          }

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
    this.ibeacon.getMonitoredRegions().then(regions => {
      regions.forEach(region => {
        console.log(
          'BleProvider: enableMonitoring(): Currently monitoring: ' +
            JSON.stringify(region)
        );
      });
    });

    this.ibeacon
      .startRangingBeaconsInRegion(this.beaconRegion)
      .then(() => {
        console.log('BleProvider: Enabled Beacon Monitoring');

        this.scanningEnabled = true;
      })
      .catch(error => {
        console.error('Unable to start Monitoring: ' + JSON.stringify(error));
      });

    //    if (this.platform.is('android')) {
    //      this.ibeacon.enableMonitoring();
    //    }
  }

  disableMonitoring() {
    this.ibeacon.stopRangingBeaconsInRegion(this.beaconRegion).then(() => {
      console.log('BleProvider: Disabled Beacon Monitoring');
    });

    if (this.platform.is('android')) {
      this.ibeacon.disableMonitoring();
    }
    // this.tags$.next(new Array<Beacon[]>());

    // this.tags$.complete();
  }

  updateTag(tagId): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tag
        .updateTagData(tagId)
        .then(() => {
          this.tagStatus[tagId] = true;
          resolve(true);
        })
        .catch(() => {
          this.tagStatus[tagId] = false;
          reject(false);
        });

      // this.tagUpdatedTimestamp[tagId] = Date.now();
    });
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
        var utc = Date.now();

        if (utc - this.last_update > this.update_interval) {
          if (data.beacons.length > 0) {
            console.info('### DETECTED ' + data.beacons.length + ' BEACONS');

            // If there are too many beacons nearby, slow down rate of updates
            if (this.update_interval < data.beacons.length * 1000) {
              // this.update_interval = data.beacons.length * 1000;
              console.log('Setting update interval to 5 seconds');
              this.update_interval = 5000;
            }

            // Pick 3 tags to update at random to prevent HTTP thread bottlenecks

            var random_beacons = [];
            var random_number_of_tags: number =
              data.beacons.length < 3 ? data.beacons.length : 3;
            for (var i = 0; i < random_number_of_tags; i++) {
              var rando = this.randomIntFromInterval(
                0,
                data.beacons.length - 1
              );
              try {
                random_beacons.push(data.beacons[rando].minor);
              } catch (e) {
                console.error(JSON.stringify(e), rando);
              }
            }

            console.log('Picked', JSON.stringify(random_beacons));

            random_beacons.forEach(minor => {
              if (!this.tagUpdatedTimestamp[minor]) {
                this.tagUpdatedTimestamp[minor] = 0;
              }

              if (!this.tagStatus[minor]) {
                this.tagStatus[minor] = true;
              }

              if (
                utc - this.tagUpdatedTimestamp[minor] > this.update_interval &&
                this.tagStatus[minor] !== false
              ) {
                this.updateTag(minor)
                  .then(() => {
                    console.log('Tag ' + minor + ' updated successfully');
                    this.tagUpdatedTimestamp[minor] = utc;
                  })
                  .catch(e => {
                    console.error('Error updating tag ' + minor + ': ' + e);
                  });
              }
            });
          }

          this.last_update = utc;
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

    if (this.platform.is('ios')) {
      this.ibeacon
        .startMonitoringForRegion(this.beaconRegion)
        .then(
          () => console.log('Native layer received the request for monitoring'),
          error =>
            console.error('Native layer failed to begin monitoring: ', error)
        );
    }
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

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}
