import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';
import { AngularFireAuth } from 'angularfire2/auth';

import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';
import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../tag/tag';
import { AlertController, LoadingController, Platform } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
import { AuthProvider } from '../auth/auth';
import { StoreSubscription } from '../../pages/order-tag/order-tag';

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
    private loadingController: LoadingController,
    private platform: Platform,
    private appVersion: AppVersion,
    private authProvider: AuthProvider
  ) {
  
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
    return moment(moment.unix(lastseen / 1000)).fromNow();
  }

  pad(n, width, z): string {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  updateTagFCMTokens(token) {
    this.authProvider
      .getUserId()
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

  getPlatform() {
    const platform = this.platform.is('ios') ? 'iOS' : 'Android';

    return platform;
  }

  getVersion(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.appVersion
        .getVersionCode()
        .then(version => {
          resolve(version);
        })
        .catch(err => {
          console.error('Unable to retrieve Version number: ' + err);
          reject(undefined);
        });
    });
  }

  subscriptionToString(subscription) {
    return `Name: ${subscription.name}
    E-Mail: ${subscription.email}
    Address: ${subscription.address1}\n${subscription.address2}
    City: ${subscription.city}
    State: ${subscription.state}
    Zipcode: ${subscription.zipcode}
    Tags: ${subscription.amount}
    Subscription Type: ${subscription.subscription_type}
    Start date: ${subscription.start_date}`;
  }

  async createSupportTicket(name, email, subject, body): Promise<any> {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const platform = this.getPlatform();
    const version = await this.getVersion();

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post(
            'https://huan.zendesk.com/api/v2/requests.json',
            {
              request: {
                requester: {
                  name: name !== null ? name : 'Anonymous',
                  email: email
                },
                subject: subject,
                comment: {
                  body:
                    body +
                    `\n\n\nUser ID: ${
                      user.uid
                    }\nPlatform: ${platform}\nVersion: ${version}`
                }
              }
            },
            httpHeaders
          )
          .subscribe(
            data => {
              resolve(data);
              console.log('Success: ' + JSON.stringify(data));
            },
            error => {
              reject(error);
              console.error('Error: ' + JSON.stringify(error));
            }
          );
      });
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
