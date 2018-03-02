import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import { AngularFireAuth } from 'angularfire2/auth';
import { FCM } from '@ionic-native/fcm';
import { Platform } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';

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

  constructor(public http: HttpClient,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    platform: Platform,
    fcm: FCM,
    private utils: UtilsProvider,
    private loc: LocationProvider) {
    console.log('Hello TagProvider Provider');

    platform.ready().then(() => {



      // Enable FCM Notifications
      fcm.getToken().then(token => {
        console.log("Received FCM Token: " + token);
        this.fcm_token = token;
      }).catch(() => {
        console.error("Unable to receive FCM token");
      })

      //Update user entries with current FCM token 
      afAuth.authState.subscribe(data => {
        if (data) {
          this.updateTagFCMTokens();
        }
      });

      fcm.onNotification().subscribe(data => {
        console.log("Notification Received");

        if (data.wasTapped) {
          alert("Received in background: " + JSON.stringify(data));
        } else {
          alert("Received in foreground: " + JSON.stringify(data));
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

      var notif = {
        "notification": {
          "title": "Your lost dog, " + data.get('name') + " has been located!",
          "body": "Near XYZ",
          "sound": "default",
          "click_action": "FCM_PLUGIN_ACTIVITY",
          "icon": "fcm_push_icon"
        },
        "data": {
          "foundBy": this.afAuth.auth.currentUser.uid,
          "param2": "value2"
        },
        "to": data.get('fcm_token'),
        "priority": "high",
        "restricted_package_name": ""
      }


      var timeDelta = utc - lastSeen.valueOf();
      console.log(paddedId + " Time Delta: " + timeDelta);

      if (lost == true &&
        timeDelta > 60000) {
        var httpHeaders = {
          headers: new HttpHeaders(
            {
              'Content-Type': 'application/json',
              'Authorization': 'key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm'
            }
          )
        }

        console.log("Sending notification");
        this.http.post(
          "https://fcm.googleapis.com/fcm/send",
          notif,
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
    }).catch(() => {
      console.error("Tag ID " + tagId + " missing from Database");
    })
  }

  updateTagFCMTokens() {
    var uid = this.afAuth.auth.currentUser.uid;

    var tagCollectionRef = this.afs.collection<Tag>('Users/' + uid);

    var token = this.getFCMToken();

    
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

