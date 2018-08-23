
import {takeUntil} from 'rxjs/operators';
import { Component, ViewChild, OnDestroy } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Tabs,
  Platform
} from 'ionic-angular';
import { MarkerProvider } from '../../providers/marker/marker';
import { NotificationProvider } from '../../providers/notification/notification';
import { TagProvider } from '../../providers/tag/tag';
import { ReplaySubject } from '../../../node_modules/rxjs/ReplaySubject';
import { SplashScreen } from '@ionic-native/splash-screen';

@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage implements OnDestroy {
  MapTab: any = 'HomePage';
  ListTab: any = 'ListPage';
  NotificationsTab: any = 'NotificationsPopoverPage';

  notificationBadge = '';
  myPetsBadge = '';

  firstLoad: boolean = true;

  @ViewChild('tabs')
  tabRef: Tabs;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private markerProvider: MarkerProvider,
    private platform: Platform,
    private notificationsProvider: NotificationProvider,
    private tagProvider: TagProvider,
    private splashscreen: SplashScreen
  ) {
    // this.platform.pause.subscribe(() => {
    //   this.tabRef.select(1);
    // });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad TabsPage');

    this.notificationsProvider
      .getNotifications().pipe(
      takeUntil(this.destroyed$))
      .subscribe(notification => {
        if (this.notificationBadge === '') {
          this.notificationBadge = '1';
        } else {
          let num = Number(this.notificationBadge);
          num++;
          this.notificationBadge = String(num);
        }
      });

    this.tagProvider
      .getTagWarnings().pipe(
      takeUntil(this.destroyed$))
      .subscribe(warnings => {
        if (warnings > 0) {
          // this.myPetsBadge = warnings.toString();
          this.myPetsBadge = '!';
        } else {
          this.myPetsBadge = '';
        }
      });
  }

  ionViewWillEnter() {
    console.log('ionViewDidEnter: Tabs Page');

    // this.platform.ready().then(() => {
    //   this.markerProvider.resetMap('mainmap');
    // });
  }

  ionViewWillLeave() {}

  tabsChange() {
    console.log('Tabs changed: ' + this.tabRef.getSelected().tabTitle);
    let tabTitle = this.tabRef.getSelected().tabTitle;

    if (tabTitle === 'Notifications') {
      this.notificationBadge = '';
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
