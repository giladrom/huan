import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, ViewChild } from '@angular/core';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import { AngularFireAuth } from 'angularfire2/auth';
import { FCM } from '@ionic-native/fcm';
import { Platform, NavController, App } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';
import { ShowPage } from '../../pages/show/show';

/*
  Generated class for the TagProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
declare let cordova: any;

export interface Tag {
  id?: string;
  name: string;
  tagId: string;
  breed: string;
  color: string;
  location: string;
  img: string;
  lastseen: string;
  active: boolean;
  lost: boolean;
  uid: string;
  fcm_token?: string;
}

@Injectable()
export class TagProvider {
  private fcm_token: string;
  private notified = {};

  //@ViewChild('mycontent') nav: NavController
  
  constructor(public http: HttpClient,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    platform: Platform,
    fcm: FCM,
    private utils: UtilsProvider,
    private loc: LocationProvider,
    private app: App) {
    console.log('Hello TagProvider Provider');

    platform.ready().then(() => {
      // Enable FCM Notifications
      fcm.getToken().then(token => {
        console.log("Received FCM Token: " + token);
        this.fcm_token = token;

        //Update our tags with current FCM token whenever our auth status changes
        afAuth.authState.subscribe(data => {
          if (data) {
            this.updateTagFCMTokens(this.fcm_token.toString());
          }
        });

      }).catch(() => {
        console.error("Unable to receive FCM token");
      })

      fcm.onNotification().subscribe(data => {
        console.log("Notification Received");

        if (data.wasTapped) {
          this.app.getActiveNav().push(ShowPage, data.tagId);
          //alert("Received in background: " + JSON.stringify(data));
        } else {
          //alert("Received in foreground: " + JSON.stringify(data));
        };
      });

      /*
      fcm.onTokenRefresh().subscribe(token => {
        console.log("Refreshed FCM Token: " + token);
      })
      */
    })
  }

  getFCMToken() {
    return this.fcm_token;
  }

  notifyIfLost(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var paddedId = this.utils.pad(tagId, 4, '0');

    var lost: boolean;

    var docData = tagCollectionRef.doc(paddedId).ref.get().then(data => {
      lost = Boolean(data.get('lost'));
      var utc = Date.now();
      var lastSeen = new Number(data.get('lastseen'));

      this.loc.getLocationName().then(locationStr => {
        var town = locationStr[0].locality + ', ' + locationStr[0].administrativeArea;

        var remoteFoundNotification = {
          "notification": {
            "title": "Your lost pet, " + data.get('name') + ", has been located!",
            "body": "Near " + town,
            "sound": "default",
            "click_action": "FCM_PLUGIN_ACTIVITY",
            "icon": "fcm_push_icon"
          },
          "data": {
            "foundBy": this.afAuth.auth.currentUser.uid,
            "tagId": data.get('tagId'),
            "type": "remoteFoundNotification"
          },
          "to": data.get('fcm_token'),
          "priority": "high",
          "restricted_package_name": ""
        }

        var localFoundNotification = {
          "notification": {
            "title": "A lost pet has been detected nearby!",
            "body": "Owners have been notified.",
            "sound": "default",
            "click_action": "FCM_PLUGIN_ACTIVITY",
            "icon": "fcm_push_icon"
          },
          "data": {
            "foundBy": this.afAuth.auth.currentUser.uid,
            "tagId": data.get('tagId'),
            "type": "localFoundNotification"
          },
          "to": this.fcm_token,
          "priority": "high",
          "restricted_package_name": ""
        }

        var timeDelta = utc - lastSeen.valueOf();
        console.log(paddedId + " Time Delta: " + timeDelta);

        // If found dog is marked as lost, send a notification
        if (lost == true &&
          this.notified[tagId] != 'true') {
          var httpHeaders = {
            headers: new HttpHeaders(
              {
                'Content-Type': 'application/json',
                'Authorization': 'key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm'
              }
            )
          }

          console.log("Sending notification:  " + remoteFoundNotification);

          this.http.post(
            "https://fcm.googleapis.com/fcm/send",
            remoteFoundNotification,
            httpHeaders
          ).subscribe(
            data => {
              console.log("Success: " + JSON.stringify(data));
              this.notified[tagId] = 'true';
            },
            error => {
              console.log("Error: " + JSON.stringify(error));
            }
          )

          this.http.post(
            "https://fcm.googleapis.com/fcm/send",
            localFoundNotification,
            httpHeaders
          ).subscribe(
            data => {
              console.log("Success: " + JSON.stringify(data));
            },
            error => {
              console.log("Error: " + JSON.stringify(error));
            }
          )
        }
      })
    }).catch(() => {
      console.error("Tag ID " + tagId + " missing from Database");
    })
  }

  updateTagFCMTokens(token) {
    var uid = this.afAuth.auth.currentUser.uid;

    var tagCollectionRef = this.afs.collection<Tag>('Tags');
    var query = tagCollectionRef.ref.where('uid', '==', uid);
    query.get().then((data) => {
      data.forEach(element => {
        console.log("*** Updating Tokens for tag " + JSON.stringify(element.data().tagId) + " with token " + JSON.stringify(token));
        var tag = this.utils.pad(element.data().tagId, 4, '0');

        tagCollectionRef.doc(tag).update({ fcm_token: token }).catch((error) => {
          console.error("Unable to update FCM token for tag " + tag + ": " + error);
        })
      });
    })
  }

  updateTagLastSeen(tagId) {
    var uid = this.afAuth.auth.currentUser.uid;

    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var utc = Date.now().toString();

    tagCollectionRef.doc(this.utils.pad(tagId, 4, '0')).update({ lastseen: utc }).catch(() => {
      console.error("Tag ID " + tagId + " missing from Database");
    });

  }

  updateTagLocation(tagId) {
    var uid = this.afAuth.auth.currentUser.uid;

    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc.getLocation().then((res) => {
      console.log(JSON.stringify(res));
      locationStr = String(res);

      var paddedId = this.utils.pad(tagId, 4, '0');

      tagCollectionRef.doc(paddedId).update({ location: locationStr }).catch(() => {
        console.error("Tag ID " + paddedId + " missing from Database");
      });
    });

  }

}

