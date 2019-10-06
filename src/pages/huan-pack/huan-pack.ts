import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import {
  ReplaySubject,
  Observable,
  throwError as observableThrowError
} from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthProvider } from '../../providers/auth/auth';

import 'rxjs/add/operator/throttleTime';

import moment from 'moment';
import {
  catchError,
  retry,
  map,
  distinct,
  filter,
  distinctUntilChanged,
  flatMap,
  mergeMap
} from 'rxjs/operators';
import { Mixpanel } from '@ionic-native/mixpanel';

@IonicPage()
@Component({
  selector: 'page-huan-pack',
  templateUrl: 'huan-pack.html'
})
export class HuanPackPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  events$: Observable<any[]>;
  updated_tags: number = 0;
  tags_added_today: number = 0;
  interval: any;
  border_color: string[] = [
    '#731283',
    '#1054FD',
    '#0F812D',
    '#FFEC34',
    '#FD8C26',
    '#E00A18'
  ];
  border_color_index: number = 0;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private afs: AngularFirestore,
    private mixpanel: Mixpanel
  ) {
    this.events$ = this.afs
      .collection('communityEvents', ref =>
        ref.orderBy('timestamp', 'desc').limit(50)
      )
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
              const data: any = a.payload.doc.data();
              const name = data.name;
              return { name, ...data };
            })
            .filter((name, i, array) => {
              console.log('searching for ', name.name);
              return array.includes(name);
            });
        })
      );
  }

  getBorderColor(event) {
    if (event.event === 'new_pet') {
      return {
        'border-left-width': '3px',
        'border-left-color': 'lime'
      };
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad HuanPackPage');

    var beginningDate = Date.now() - 3600000;
    var beginningDateObject = new Date(beginningDate);

    this.afs
      .collection('Tags')
      .ref.where('tagattached', '==', true)
      .where('lastseen', '>', beginningDateObject)
      .get()
      .then(snapshot => {
        var int = setInterval(() => {
          this.updated_tags++;

          if (this.updated_tags >= snapshot.size) {
            clearInterval(int);
          }
        }, 10);
      })
      .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
      });

    var oneDayAgo = Date.now() - 3600000 * 24;
    var oneDayAgoObject = new Date(oneDayAgo);

    this.afs
      .collection('Tags')
      .ref.where('tagattached', '==', false)
      .where('lastseen', '>', oneDayAgoObject)
      .get()
      .then(snapshot => {
        var int = setInterval(() => {
          this.tags_added_today++;

          if (this.tags_added_today == snapshot.size) {
            clearInterval(int);
          }
        }, 10);
      })
      .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
      });
  }

  ionViewDidEnter() {
    this.mixpanel
      .track('huan_pack_page')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.interval = setInterval(() => {
      var beginningDate = Date.now() - 3600000;
      var beginningDateObject = new Date(beginningDate);

      this.afs
        .collection('Tags')
        .ref.where('tagattached', '==', true)
        .where('lastseen', '>', beginningDateObject)
        .get()
        .then(snapshot => {
          this.updated_tags = snapshot.size;
        })
        .catch(e => {
          console.error('Unable to retrieve tag: ' + e);
        });
    }, 5000);
  }

  ionViewWillLeave() {
    clearInterval(this.interval);
  }

  showTime(timestamp) {
    return moment.unix(timestamp.toDate() / 1000).fromNow();
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
