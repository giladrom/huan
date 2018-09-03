import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { FCM } from '@ionic-native/fcm';
import { Toast } from '@ionic-native/toast';

import {
  Platform,
  App,
  PopoverController,
  AlertController
} from 'ionic-angular';
import { LocationProvider } from '../location/location';
import { UtilsProvider } from '../utils/utils';
import { MarkerProvider } from '../marker/marker';
import { ReplaySubject, Observable } from 'rxjs';
import { AngularFirestore } from 'angularfire2/firestore';
import { AuthProvider } from '../auth/auth';
import { Subscription } from '../../../node_modules/rxjs/Subscription';
import { resolve } from 'dns';
import { SettingsProvider } from '../settings/settings';
import { Badge } from '@ionic-native/badge';

export interface Notification {
  title: string | null;
  body: any | null;
  timestamp: any | null;
}

@Injectable()
export class NotificationProvider implements OnDestroy {
  private fcm_token: string;

  private notifications$ = new ReplaySubject<Notification[]>();
  private notificationsArray = [];

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  // private uid = undefined;

  private httpHeaders = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization:
        'key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm'
    })
  };

  private subscription: Subscription;

  constructor(
    public http: HttpClient,
    private platform: Platform,
    private fcm: FCM,
    private app: App,
    private loc: LocationProvider,
    private utils: UtilsProvider,
    private toast: Toast,
    private popoverCtrl: PopoverController,
    private markerProvider: MarkerProvider,
    private afs: AngularFirestore,
    private authProvider: AuthProvider,
    private settingsProvider: SettingsProvider,
    private badge: Badge,
    private alertCtrl: AlertController
  ) {}

  init() {
    // this.authProvider.getUserId().then(uid => {
    //   this.uid = uid;
    // });

    this.platform.ready().then(() => {
      this.updateTokens();

      this.subscription = this.fcm
        .onNotification()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(data => {
          console.log('Notification Received: ' + JSON.stringify(data));

          this.notificationsArray.push({
            title: data.title,
            body: data.body,
            timestamp: Date.now()
          });

          this.notifications$.next([
            {
              title: data.title,
              body: data.body,
              timestamp: Date.now()
            }
          ]);

          if (data.wasTapped) {
            if (data.function) {
              switch (data.function) {
                case 'show_marker':
                  // this.markerProvider.showSingleMarker(data.location);
                  this.markerProvider.showSingleMarker(data.tagId, true);
                  break;

                case 'show_location':
                  break;

                case 'lost_pet':
                  this.markerProvider.showInfoPopover(data.tagId);
                  break;

                case 'coowner_permission':
                  this.showCoOwnerConfirmDialog(
                    'Confirm Request',
                    data.body,
                    data.uid,
                    data.tagId
                  );
                  break;
              }
            }
          } else {
            if (data.function === 'coowner_permission') {
              this.showCoOwnerConfirmDialog(
                'Confirm Request',
                data.body,
                data.uid,
                data.tagId
              );
            }
          }
        });
    });
  }

  updateTokens() {
    // Get FCM token and update the DB
    this.fcm
      .getToken()
      .then(token => {
        console.log('Received FCM Token: ' + token);
        this.fcm_token = token;

        this.utils.updateTagFCMTokens(token);
      })
      .catch(() => {
        console.error('Unable to receive FCM token');
      });
  }

  showCoOwnerConfirmDialog(title, text, uid, tagId) {
    let alert = this.alertCtrl.create({
      title: title,
      message: text,
      buttons: [
        {
          text: 'Decline',
          role: 'cancel',
          handler: () => {
            console.log('Decline clicked');
          }
        },
        {
          text: 'Confirm',
          handler: () => {
            console.log('Confirm clicked');
            console.log('Adding ' + uid + ' as co-owner for tag ' + tagId);

            this.utils.addCoOwnerToTag(tagId, uid);
          }
        }
      ]
    });
    alert.present();
  }

  subscribeToCommunity(name = '') {
    return new Promise<any>((resolve, reject) => {
      if (name.length === 0) {
        console.warn('subscribeToCommunity: no community string found.');

        this.loc
          .getCommunityId()
          .then(community => {
            this.fcm
              .subscribeToTopic(community)
              .then(res => {
                resolve(community);
                console.log(
                  'Successfully subscribed to community notifications: ' +
                    community +
                    ': ' +
                    res
                );
              })
              .catch(e => {
                reject(e);
                console.error(
                  'Unable to subscribe to community notifications: ' +
                    community +
                    ' :' +
                    e
                );
              });
          })
          .catch(e => {
            console.error('Unable to get community: ' + e);
            reject(e);
          });
      } else {
        console.warn(
          'subscribeToCommunity: Existing community string found: ' + name
        );

        this.fcm
          .subscribeToTopic(name)
          .then(res => {
            resolve(name);
            console.log(
              'Successfully subscribed to community notifications: ' +
                name +
                ': ' +
                res
            );
          })
          .catch(e => {
            reject(e);
            console.error(
              'Unable to subscribe to community notifications: ' +
                name +
                ' :' +
                e
            );
          });
      }
    });
  }

  unsubscribeFromCommunity(topic) {
    return new Promise<any>((resolve, reject) => {
      this.fcm
        .unsubscribeFromTopic(topic)
        .then(res => {
          console.log(
            'Successfully unsubscribed from community notifications: ' + topic
          );

          resolve(res);
        })
        .catch(e => {
          console.error(
            'Unable to unsubscribe from community notifications: ' +
              topic +
              ' :' +
              e
          );

          reject(e);
        });
    });
  }

  sendNotification(notification) {
    //this.platform.ready().then(() => {
    this.http
      .post(
        'https://fcm.googleapis.com/fcm/send',
        notification,
        this.httpHeaders
      )
      .subscribe(
        data => {
          console.log('Success: ' + JSON.stringify(data));
        },
        error => {
          console.log('Error: ' + JSON.stringify(error));
        }
      );
    //})
  }

  sendRemoteFoundNotification(petName, foundBy, tagId, destinationToken) {
    this.loc.getLocationName().then(locationStr => {
      var town =
        locationStr[0].locality + ', ' + locationStr[0].administrativeArea;

      var remoteFoundNotification = {
        notification: {
          title: 'Your lost pet, ' + petName + ', has been located!',
          body: 'Near ' + town,
          sound: 'default',
          click_action: 'FCM_PLUGIN_ACTIVITY',
          icon: 'fcm_push_icon'
        },
        data: {
          foundBy: foundBy,
          tagId: tagId,
          type: 'remoteFoundNotification'
        },
        to: destinationToken,
        priority: 'high',
        restricted_package_name: ''
      };

      console.log('Sending notification:  ' + remoteFoundNotification);

      this.sendNotification(remoteFoundNotification);
    });
  }

  sendLocalFoundNotification(tagId) {
    this.authProvider.getUserId().then(uid => {
      var localFoundNotification = {
        notification: {
          title: 'A lost pet has been detected nearby!',
          body: 'Owners have been notified.',
          sound: 'default',
          click_action: 'FCM_PLUGIN_ACTIVITY',
          icon: 'fcm_push_icon'
        },
        data: {
          foundBy: uid,
          tagId: tagId,
          type: 'localFoundNotification'
        },
        to: this.fcm_token,
        priority: 'high',
        restricted_package_name: ''
      };

      this.sendNotification(localFoundNotification);
    });
  }

  sendLocalNotification(title, body) {
    var localNotification = {
      notification: {
        title: title,
        body: body,
        sound: 'default',
        click_action: 'FCM_PLUGIN_ACTIVITY',
        icon: 'fcm_push_icon'
      },
      data: {
        type: 'localNotification'
      },
      to: this.fcm_token,
      priority: 'high',
      restricted_package_name: ''
    };

    this.sendNotification(localNotification);
  }

  sendCoOwnerNotification(title, body, token, uid, tagId) {
    const payload = {
      mutable_content: true,
      notification: {
        title: title,
        body: body,
        sound: 'default',
        click_action: 'FCM_PLUGIN_ACTIVITY',
        icon: 'fcm_push_icon'
      },
      data: {
        title: title,
        body: body,
        uid: uid,
        tagId: tagId,
        function: 'coowner_permission'
      },
      to: token
    };

    this.sendNotification(payload);
  }

  getFCMToken() {
    return this.fcm_token;
  }

  showNotificationsPopover(event) {
    let popover = this.popoverCtrl.create(
      'NotificationsPopoverPage',
      {},
      {
        enableBackdropDismiss: true,
        cssClass: 'show-notifications-popover'
      }
    );

    popover.present({ ev: event });
  }

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  clearNotifications() {
    this.notifications$.complete();
    this.notifications$ = new ReplaySubject<Notification[]>();
  }

  stop() {
    this.destroyed$.next(true);
    this.destroyed$.complete();

    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    this.stop();
  }
}
