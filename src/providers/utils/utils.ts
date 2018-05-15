import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';
import { AngularFireAuth } from 'angularfire2/auth';

import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';
import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../tag/tag';
import { AlertController, LoadingController } from 'ionic-angular';

@Injectable()
export class UtilsProvider implements OnDestroy {
  private subscription: any;
  alive: boolean = true;

  componentDestroyed$: Subject<boolean> = new Subject();

  constructor(
    public http: HttpClient,
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    console.log('Hello UtilsProvider Provider');
  }

  displayAlert(title, message?) {
    let alert = this.alertController.create({
      title: title,
      message: message,
      buttons: [
        {
          text: 'Ok',
          handler: () => {}
        }
      ],
      cssClass: 'alertclass'
    });

    alert.present();
  }

  presentLoading(duration) {
    let loader = this.loadingController.create({
      content: 'Please wait...',
      duration: duration
    });

    loader.present();

    return loader;
  }

  getLastSeen(lastseen) {
    var ls = moment.unix(lastseen / 1000);
    var now = moment(Date.now());

    var timeDiffString = '';

    var days = now.diff(ls, 'days');
    now.subtract(days, 'days');
    var hours = now.diff(ls, 'hours');
    now.subtract(hours, 'hours');
    var minutes = now.diff(ls, 'minutes');
    //var seconds = now.diff(ls, 'seconds');

    if (minutes < 1) {
      timeDiffString += 'less than a minute ago';
      return timeDiffString;
    }

    if (days > 0) {
      timeDiffString += days + ' Days, ';
    }

    if (hours == 1) {
      timeDiffString += hours + ' Hour, ';
    } else if (hours > 1) {
      timeDiffString += hours + ' Hours, ';
    }

    timeDiffString +=
      minutes + (Number(minutes) < 2 ? ' Minute ago' : ' Minutes ago');

    return timeDiffString;
  }

  pad(n, width, z): string {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  getUserId(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.subscription = this.afAuth.authState.subscribe(
        user => {
          if (user) {
            this.subscription.unsubscribe();

            resolve(this.afAuth.auth.currentUser.uid);
          } else {
            this.subscription.unsubscribe();
            reject('getUserId: User is not currently logged in.');
          }
        },
        err => {
          this.subscription.unsubscribe();

          reject('getUserId: Unable to get auth state: ' + err);
        }
      );
    });
  }

  updateTagFCMTokens(token) {
    this.getUserId()
      .then(uid => {
        var tagCollectionRef = this.afs.collection<Tag>('Tags');
        var query = tagCollectionRef.ref.where('uid', '==', uid);
        query.get().then(data => {
          data.forEach(element => {
            console.log(
              '*** Updating Tokens for tag ' +
                JSON.stringify(element.data().tagId) +
                ' with token ' +
                JSON.stringify(token)
            );
            var tag = this.pad(element.data().tagId, 4, '0');

            tagCollectionRef
              .doc(tag)
              .update({ fcm_token: token })
              .catch(error => {
                console.error(
                  'Unable to update FCM token for tag ' + tag + ': ' + error
                );
              });
          });
        });
      })
      .catch(error => {
        console.error('updateTagFCMTokens: ' + JSON.stringify(error));
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
