import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';
import { AngularFireAuth } from 'angularfire2/auth';

import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/takeUntil';
import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../tag/tag';
import {
  AlertController,
  LoadingController,
  Platform,
  ActionSheetController
} from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
import { AuthProvider } from '../auth/auth';
import { StoreSubscription } from '../../pages/order-tag/order-tag';
import { LocationProvider } from '../location/location';
import { MarkerProvider } from '../marker/marker';
import { SMS } from '@ionic-native/sms';
import { SocialSharing } from '@ionic-native/social-sharing';

@Injectable()
export class UtilsProvider implements OnDestroy {
  private subscription: any;
  alive: boolean = true;

  private loader;

  componentDestroyed$: Subject<boolean> = new Subject();

  constructor(
    public http: HttpClient,
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private platform: Platform,
    private appVersion: AppVersion,
    private authProvider: AuthProvider,
    private locationProvider: LocationProvider,
    private markerProvider: MarkerProvider,
    private actionSheetCtrl: ActionSheetController,
    private sms: SMS,
    private socialSharing: SocialSharing
  ) {}

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

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingController.create({
        content: 'Please Wait...'
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
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

  // Generate random referral code
  // Shamelessly stolen from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript#8084248
  makeid() {
    var text = '';
    var possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  generateReferralCode(): Promise<any> {
    return new Promise((resolve, reject) => {
      var reportCollectionRef = this.afs.collection('Referrals');

      this.authProvider.getUserId().then(uid => {
        let code = this.makeid();

        reportCollectionRef
          .doc(code)
          .set({
            uid: uid
          })
          .then(() => {
            resolve(code);
          })
          .catch(e => {
            console.error('generateReferralCode(): ' + e);
            reject(e);
          });
      });
    });
  }

  textReferralCode() {
    this.showLoading();

    this.generateReferralCode()
      .then(code => {
        this.dismissLoading();

        let invite = `Welcome to Huan! Please use the following link to sign up: https://gethuan.com/#/register/${code}`;

        this.socialSharing
          .shareWithOptions({
            message:
              'Welcome to Huan! Please use the following URL to Sign up:',
            subject: 'Huan Beta Invite',
            url: `https://gethuan.com/#/register/${code}`
          })
          .then(res => {
            console.log('Invite shared successfully: ' + JSON.stringify(res));
            if (res.completed) {
              this.displayAlert('Invite sent!');
            }
          })
          .catch(e => {
            console.error(e);
            this.displayAlert('Unable to send invite');
          });

        // this.sms
        //   .send('', invite, { android: { intent: 'INTENT' } })
        //   .then(() => {
        //     console.log('Successfully sent invite');
        //     this.displayAlert('Invite sent!');
        //   })
        //   .catch(e => {
        //     console.error('Unable to send invite');
        //     this.displayAlert('Unable to send invite');
        //   });
      })
      .catch(e => {
        this.dismissLoading();

        console.error('Unable to send invite: ' + JSON.stringify(e));
      });
  }

  subscriptionToString(subscription) {
    return `Name: ${subscription.name}
    E-Mail: ${subscription.email}
    Address: ${subscription.address1}\n${subscription.address2}
    City: ${subscription.city}
    State: ${subscription.state}
    Zipcode: ${subscription.zipcode}
    Tags: ${subscription.amount}`;
    // Subscription Type: ${subscription.subscription_type}
    // Start date: ${subscription.start_date}`;
  }

  sendReport(report) {
    var reportCollectionRef = this.afs.collection('Reports');

    var locationStr = '';
    this.authProvider.getUserId().then(uid => {
      this.locationProvider
        .getLocation()
        .then(loc => {
          var timestamp = Date.now();

          reportCollectionRef
            .doc(timestamp.toString())
            .set({
              report: report,
              uid: uid,
              location: loc,
              timestamp: timestamp
            })
            .catch(e => {
              console.error('sendReport: ' + e);
            });
        })
        .catch(e => {
          console.error('sendReport(): ' + JSON.stringify(e));
        });
    });
  }

  getDirections(name, location) {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      title: 'Show directions to ' + name + '?',
      buttons: [
        {
          text: 'Open in Maps',
          handler: () => {
            if (this.platform.is('ios')) {
              window.open(
                'maps://?q=' + name + '&daddr=' + location,
                '_system'
              );
            }

            if (this.platform.is('android')) {
              window.open(
                'geo://' + '?q=' + location + '(' + name + ')',
                '_system'
              );
            }
          }
        }
      ]
    });

    actionSheet.onDidDismiss(() => {
      this.markerProvider.resetMap('mainmap');
    });

    actionSheet.present();
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
