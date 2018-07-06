import { Component, ViewChild } from '@angular/core';
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

@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage {
  MapTab: any = 'HomePage';
  ListTab: any = 'ListPage';
  NotificationsTab: any = 'NotificationsPopoverPage';

  notificationBadge = '';
  myPetsBadge = '';

  firstLoad: boolean = true;

  @ViewChild('tabs') tabRef: Tabs;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private markerProvider: MarkerProvider,
    private platform: Platform,
    private notificationsProvider: NotificationProvider,
    private tagProvider: TagProvider
  ) {
    // this.platform.pause.subscribe(() => {
    //   this.tabRef.select(1);
    // });

    this.notificationsProvider.getNotifications().subscribe(notification => {
      if (this.notificationBadge === '') {
        this.notificationBadge = '1';
      } else {
        let num = Number(this.notificationBadge);
        num++;
        this.notificationBadge = String(num);
      }
    });

    this.tagProvider.getTagWarnings().subscribe(warnings => {
      if (warnings > 0) {
        this.myPetsBadge = warnings.toString();
      } else {
        this.myPetsBadge = '';
      }
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad TabsPage');
  }

  ionViewWillEnter() {
    console.log('ionViewDidEnter: Tabs Page');

    this.platform.ready().then(() => {
      this.markerProvider.resetMap('mainmap');
    });
  }

  ionViewWillLeave() {}

  tabsChange() {
    console.log('Tabs changed: ' + this.tabRef.getSelected().tabTitle);
    let tabTitle = this.tabRef.getSelected().tabTitle;

    if (tabTitle === 'Notifications') {
      this.notificationBadge = '';
    }
  }
}
