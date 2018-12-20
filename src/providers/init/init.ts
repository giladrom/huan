import { sample, takeUntil } from 'rxjs/operators';
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

@Injectable()
export class InitProvider {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private connection$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public http: HttpClient,
    private settingsProvider: SettingsProvider,
    private authProvider: AuthProvider,
    private tagProvider: TagProvider,
    private ble: BleProvider,
    private notificationsProvider: NotificationProvider,
    private utilsProvider: UtilsProvider,
    private network: Network,
    private platform: Platform,
    private branch: BranchIo
  ) {
    // XXX Detect connectivity
    this.platform.ready().then(() => {
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
    });

    this.platform.resume.subscribe(r => {
      this.initBranch();
    });
  }

  initBranch() {
    this.branch
      .setDebug(false)
      .then(r => {
        console.log('Branch Debug Enabled');
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

    this.branch
      .setCookieBasedMatching('71ax.app.link')
      .then(r => {
        console.log('setCookieBasedMatching', r);
      })
      .catch(e => {
        console.error('Branch.setCookieBasedMatching', JSON.stringify(e));
      });

    this.authProvider
      .getUserId()
      .then(uid => {
        this.branch
          .setIdentity(uid)
          .then(r => {
            console.log('Branch.setIdentity', JSON.stringify(r));

            this.branch
              .loadRewards('referral')
              .then(rewards => {
                console.log(
                  'Branch.rewards [referral]',
                  JSON.stringify(rewards)
                );
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
            console.error('Branch.setIdentity', e);
          });
      })
      .catch(e => {
        console.error('getUserId', e);
      });

    this.branch
      .initSession()
      .then(r => {
        console.log('Branch initialized...', JSON.stringify(r));

        if (r['+is_first_session']) {
          if (r['invite'] === true) {
            console.info('Received an invite', JSON.stringify(r));

            this.utilsProvider.handleInvite(r['uid'], r['token']);
          }

          this.authProvider
            .getUserId()
            .then(uid => {
              this.branch
                .userCompletedAction('installed', { uid: uid })
                .then(r => {
                  console.log(
                    'handleInvite: Registered install event',
                    JSON.stringify(r)
                  );
                })
                .catch(e => {
                  console.error(
                    'handleInvite: could not register install event',
                    JSON.stringify(e)
                  );
                });
            })
            .catch(e => {
              console.error('getUserId', e);
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
  }

  initializeApp() {
    // FIXME: Only initialize auth/settings providers if we're online to make sure we
    // don't overwrite existing information

    this.connection$.subscribe(() => {
      console.warn('### InitProvider: Initializing app');

      this.authProvider.init();
      this.settingsProvider.init();
      this.tagProvider.init();
      this.ble.init();
      this.notificationsProvider.init();
      this.initBranch();

      this.setupCommunityNotifications();

      // Wait until app has initialized before scanning for battery status
      // setTimeout(() => {
      //   this.getBatteryStatus();
      // }, 5000);
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
    }, 15000);
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

    this.notificationsProvider.stop();
    this.ble.stop();
    this.authProvider.stop();
    this.tagProvider.stop();
    this.settingsProvider.stop();
  }
}
