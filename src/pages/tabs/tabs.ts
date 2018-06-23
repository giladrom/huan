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

  ionViewDidEnter() {
    console.log('ionViewDidEnter: Tabs Page');

    let map = this.markerProvider.getMap();

    console.log('Map: ' + JSON.stringify(map));

    try {
      map.setDiv('mainmap');
    } catch (e) {
      console.error(e);
    }
  }
}
