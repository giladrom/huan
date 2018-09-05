import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from 'rxjs';
import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {
  NotificationProvider,
  Notification
} from '../../providers/notification/notification';
import { AngularFirestore } from 'angularfire2/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import moment from 'moment';
import { AuthProvider } from '../../providers/auth/auth';
import { catchError, retry, map } from 'rxjs/operators';
import { MarkerProvider } from '../../providers/marker/marker';

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
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider,
    private markerProvider: MarkerProvider
  ) {
    this.destroyed$ = new ReplaySubject(1);

    this.authProvider.getUserId().then(uid => {
      this.notifications$ = this.afs
        .collection('Users')
        .doc(uid)
        .collection<Notification>('notifications')
        .snapshotChanges()
        .pipe(
          catchError(e => observableThrowError(e)),
          retry(2)
        )
        .takeUntil(this.destroyed$)
        .pipe(
          map(actions => {
            return actions
              .map(a => {
                const data = a.payload.doc.data();
                const id = a.payload.doc.id;
                return { id, ...data };
              })
              .sort((a, b) => {
                return Number(b.id) - Number(a.id);
              })
              .slice(0, 15);
          })
        );
    });
  }

  notificationAction(data) {
    console.log(JSON.stringify(data));

    if (data.function !== '') {
      switch (data.function) {
        case 'show_marker':
          this.markerProvider.showSingleMarker(data.tagId, true);

          // Switch to Map Tab
          this.navCtrl.parent.select(0);
          break;

        case 'show_location':
          this.markerProvider.showSingleMarker(data.location, false);

          // Switch to Map Tab
          this.navCtrl.parent.select(0);
          break;

        case 'lost_pet':
          // this.markerProvider.showInfoPopover(data.tagId);
          this.navCtrl.push('ShowPage', {
            tagId: data.tagId,
            anonymous: false
          });
          // Switch to Map Tab
          // this.navCtrl.parent.select(0);
          break;
      }
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NotificationsPopoverPage');
  }

  showTime(timestamp) {
    return moment.unix(timestamp / 1000).fromNow();
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
