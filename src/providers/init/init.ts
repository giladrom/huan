import { sample, takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
// import { UtilsProvider } from '../utils/utils';
import { SettingsProvider } from '../settings/settings';
import { BleProvider } from '../ble/ble';
import { AuthProvider } from '../auth/auth';
import { TagProvider } from '../tag/tag';
import { NotificationProvider } from '../notification/notification';
import { ReplaySubject, Observable, Subject } from 'rxjs';
import { Beacon } from '@ionic-native/ibeacon';
import { UtilsProvider } from '../utils/utils';

@Injectable()
export class InitProvider {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private tags$: Observable<Beacon[]>;

  constructor(
    public http: HttpClient,
    private settingsProvider: SettingsProvider,
    private authProvider: AuthProvider,
    private tagProvider: TagProvider,
    private ble: BleProvider,
    private notificationsProvider: NotificationProvider,
    private utilsProvider: UtilsProvider
  ) {}

  initializeApp() {
    this.authProvider.init();
    this.settingsProvider.init();
    this.tagProvider.init();
    this.ble.init();
    this.notificationsProvider.init();

    this.setupCommunityNotifications();

    // Wait until app has initialized before scanning for battery status
    setTimeout(() => {
      this.getBatteryStatus();
    }, 10000);
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
