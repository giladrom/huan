import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {
  NotificationProvider,
  Notification
} from '../../providers/notification/notification';
import { Observable } from 'rxjs/Observable';
import { AngularFirestore } from 'angularfire2/firestore';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { UtilsProvider } from '../../providers/utils/utils';
import moment from 'moment';

@IonicPage()
@Component({
  selector: 'page-notifications-popover',
  templateUrl: 'notifications-popover.html'
})
export class NotificationsPopoverPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  notifications$: Observable<any[]>;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private notificationsProvider: NotificationProvider,
    private afs: AngularFirestore,
    private utilsProvider: UtilsProvider
  ) {
    this.destroyed$ = new ReplaySubject(1);

    this.utilsProvider.getUserId().then(uid => {
      this.notifications$ = this.afs
        .collection('Users')
        .doc(uid)
        .collection<Notification>('notifications', ref => ref.limit(10))
        .snapshotChanges()
        .takeUntil(this.destroyed$)
        .map(actions => {
          return actions
            .map(a => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              return { id, ...data };
            })
            .sort((a, b) => {
              return Number(b.id) - Number(a.id);
            });
        });
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NotificationsPopoverPage');
  }

  showTime(timestamp) {
    return moment.unix(timestamp / 1000).format('LT');
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
