import { Component, ViewChild } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  Tabs,
  Platform
} from 'ionic-angular';
import { MarkerProvider } from '../../providers/marker/marker';

@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage {
  MapTab: any = 'HomePage';
  ListTab: any = 'ListPage';
  NotificationsTab: any = 'NotificationsPopoverPage';

  firstLoad: boolean = true;

  @ViewChild('tabs') tabRef: Tabs;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private markerProvider: MarkerProvider,
    private platform: Platform
  ) {
    // this.platform.pause.subscribe(() => {
    //   this.tabRef.select(1);
    // });
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
}
