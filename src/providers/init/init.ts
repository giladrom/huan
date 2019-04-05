import { sample, takeUntil, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
// import { UtilsProvider } from '../utils/utils';
import { SettingsProvider } from '../settings/settings';
import { BleProvider } from '../ble/ble';
import { AuthProvider } from '../auth/auth';
import { TagProvider } from '../tag/tag';
import { NotificationProvider } from '../notification/notification';
import { ReplaySubject, Observable, Subject, BehaviorSubject } from 'rxjs';
import { Beacon } from '@ionic-native/ibeacon';
import { UtilsProvider } from '../utils/utils';
import { Network } from '@ionic-native/network';
import { Platform } from 'ionic-angular';
import { BranchIo } from '@ionic-native/branch-io';
import { Mixpanel } from '@ionic-native/mixpanel';
import { SensorProvider } from '../sensor/sensor';
import { LocationProvider } from '../../providers/location/location';
import { FCM } from '@ionic-native/fcm';

@Injectable()
export class InitProvider {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private connection$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public http: HttpClient,
    private settingsProvider: SettingsProvider,
    private authProvider: AuthProvider,
    private tagProvider: TagProvider,
    private sensor: SensorProvider,
    private ble: BleProvider,
    private notificationsProvider: NotificationProvider,
    private utilsProvider: UtilsProvider,
    private locationProvider: LocationProvider,
    private network: Network,
    private platform: Platform,
    private branch: BranchIo,
    private mixpanel: Mixpanel,
    private fcm: FCM,
  ) {
    // XXX Detect connectivity
    this.platform.ready().then(() => {
      console.warn('### InitProvider', this.network.type);
      if (this.network.type !== 'none' && this.network.type !== 'unknown') {
        console.warn('### InitProvider: Phone is online - initializing...');
        this.connection$.next(true);
        this.connection$.complete();
      } else {
        console.warn('### InitProvider: Phone is not online - Waiting...');

        this.network.onConnect().subscribe(() => {
          console.warn('### InitProvider: Connection restored');

          this.connection$.next(true);
          this.connection$.complete();
        });
      }

      this.initMixpanel();
    });

    this.platform.resume.subscribe(r => {
      this.initBranch();
    });
  }


  initBranch() {
    this.branch
      .setDebug(false)
      .then(r => {
        console.log('Branch Debug Disabled');
      })
      .catch(e => {
        console.error('Branch.setDebug', e);
      });

    this.branch
      .disableTracking(false)
      .then(r => {
        console.log('Branch disableTracking', r);
      })
      .catch(e => {
        console.error('Branch.disableTracking', e);
      });

    this.authProvider
      .getUserId()
      .then(uid => {
        this.branch
          .initSession()
          .then(r => {
            this.branch
              .setIdentity(uid)
              .then(r => {
                console.log('Branch.setIdentity', JSON.stringify(r));
              })
              .catch(e => {
                console.error('Branch.setIdentity', e);
              });

            this.branch
              .setCookieBasedMatching('fetch.gethuan.com')
              .then(r => {
                console.log('setCookieBasedMatching', r);
              })
              .catch(e => {
                console.error(
                  'Branch.setCookieBasedMatching',
                  JSON.stringify(e)
                );
              });

            console.log('Branch initialized...', JSON.stringify(r));

            if (r['+is_first_session']) {
              if (r['invite'] === true) {
                console.info('Received an invite', JSON.stringify(r));

                this.utilsProvider.handleInvite(r['uid'], r['token']);
              }

              this.branch
                .userCompletedAction('installed', { uid: uid })
                .then(r => {
                  console.log(
                    'handleInvite: Registered install event',
                    JSON.stringify(r)
                  );

                  this.branch.getFirstReferringParams().then(params => {
                    console.log('referral team', params.team);
      
                    this.authProvider.setTeam(params.team).then(() => { }).catch(e => {
                      console.error('setTeam', JSON.stringify(e));
                    })
                  }).catch(e => {
                    console.error('params', e);
                  });
      
                })
                .catch(e => {
                  console.error(
                    'handleInvite: could not register install event',
                    JSON.stringify(e)
                  );
                });
            }

           


            if (r['coowner'] === true) {
              console.info('Received a coowner request', JSON.stringify(r));
              this.utilsProvider.handleCoOwner(
                r['uid'],
                r['token'],
                r['name'],
                r['tagId'],
                r['tagName']
              );
            }
          })
          .catch(e => {
            console.error('Branch init', e);
          });

        this.branch
          .loadRewards('referral')
          .then(rewards => {
            console.log('Branch.rewards [referral]', JSON.stringify(rewards));
          })
          .catch(e => {
            console.error('Branch.rewards', JSON.stringify(e));
          });

        this.branch
          .loadRewards('active')
          .then(rewards => {
            console.log('Branch.rewards [active]', JSON.stringify(rewards));
          })
          .catch(e => {
            console.error('Branch.rewards', JSON.stringify(e));
          });
      })
      .catch(e => {
        console.error('getUserId', e);
      });
  }

  initMixpanel() {
    this.mixpanel
      .init('6deffdd0529e5eaa1ab817264456f76e')
      .then(r => {
        console.log('Mixpanel initialized', r);

        this.authProvider.getUserId().then(uid => {
          this.mixpanel.registerSuperProperties({ uid: uid }).then(() => {
            // this.mixpanel
            //   .track('App Init')
            //   .then(() => {})
            //   .catch(e => {
            //     console.error('Mixpanel Error', e);
            //   });
          });
        });
      })
      .catch(e => {
        console.error('Error initializing Mixpanel', e);
      });
  }


  initializeApp() {
    this.connection$.subscribe(() => {
      console.warn('### InitProvider: Initializing app');

      this.authProvider.init();
      this.settingsProvider.init();


      this.authProvider
        .getUserId()
        .then(uid => {

          this.locationProvider.init();
          this.ble.init();
          this.notificationsProvider.init();
          this.tagProvider.init();

          this.settingsProvider
            .getSettings()
            .pipe(takeUntil(this.destroyed$))
            .subscribe(settings => {
              if (settings) {
                if (settings.sensor) {
                  this.sensor.init();
                }
              }
            });
        });

      this.initBranch();

      this.setupCommunityNotifications();
    });
  }

  getBatteryStatus() {
    var stop$ = new Subject();
    var sample$ = new Subject();

    console.log('getBatteryStatus(): Initiating Startup scan...');

    this.ble.startScan();
    this.ble
      .getTags()
      .pipe(
        takeUntil(stop$),
        sample(sample$)
      )
      .subscribe(tags => {
        tags.forEach(tag => {
          let tagId = this.utilsProvider.pad(tag.info.minor, 4, '0');

          console.log(
            `getBatteryStatus(): Tag ${tagId}: Battery: ${tag.info.batt}`
          );

          this.tagProvider.updateTagBattery(tagId, tag.info.batt);
        });
      });

    setTimeout(() => {
      console.log('getBatteryStatus(): Finished scan');

      sample$.next(true);

      stop$.next(true);
      stop$.complete();
      this.ble.stopScan();
    }, 30000);
  }

  setupCommunityNotifications() {
    // Community Notifications Subscribe/Unsubscribe

    this.settingsProvider
      .getSettings()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(settings => {
        if (settings) {
          if (settings.communityNotifications) {
            this.notificationsProvider
              .subscribeToCommunity(settings.communityNotificationString)
              .then(res => {
                console.log('Community Notifications Enabled: ' + res);

                this.settingsProvider.setCommunityNotificationString(res);
              })
              .catch(e => {
                console.error(
                  'Cannot subscribe to community notifications: ' + e
                );
              });
          } else {
            this.notificationsProvider
              .unsubscribeFromCommunity(settings.communityNotificationString)
              .then(res => {
                console.log(
                  'Community Notifications Disabled: ' +
                  settings.communityNotificationString
                );

                this.settingsProvider.setCommunityNotificationString('');
              })
              .catch(e => {
                console.error(
                  'Cannot unsubscribe from community notifications: ' + e
                );
              });
          }
        }
      });
  }

  shutdownApp() {
    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.sensor.stop();
    this.notificationsProvider.stop();
    this.ble.stop();
    this.authProvider.stop();
    this.tagProvider.stop();
    this.settingsProvider.stop();
  }
}
