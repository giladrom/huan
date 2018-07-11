import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
// import { UtilsProvider } from '../utils/utils';
import { SettingsProvider } from '../settings/settings';
import { BleProvider } from '../ble/ble';
import { AuthProvider } from '../auth/auth';
import { TagProvider } from '../tag/tag';
import { NotificationProvider } from '../notification/notification';

@Injectable()
export class InitProvider {
  constructor(
    public http: HttpClient,
    private settingsProvider: SettingsProvider,
    private authProvider: AuthProvider,
    private tagProvider: TagProvider,
    private ble: BleProvider,
    private notificationsProvider: NotificationProvider
  ) {}

  initializeApp() {
    this.authProvider.init();
    this.settingsProvider.init();
    this.tagProvider.init();
    this.notificationsProvider.init();
    this.ble.init();
  }

  shutdownApp() {
    this.ble.stop();
    this.authProvider.stop();
    this.tagProvider.stop();
    this.settingsProvider.stop();
  }
}
