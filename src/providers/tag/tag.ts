import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import {
  AngularFirestore,
  AngularFirestoreCollection
} from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import { AngularFireAuth } from 'angularfire2/auth';
import { FCM } from '@ionic-native/fcm';
import { Platform } from 'ionic-angular';

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
}

@Injectable()
export class TagProvider {

  constructor(public http: HttpClient,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    platform: Platform,
    fcm: FCM) {
    console.log('Hello TagProvider Provider');

    platform.ready().then(() => {

      // Enable FCM Notifications
      //if (afAuth.auth.currentUser.uid !== undefined) {
      fcm.subscribeToTopic('Huan');

      fcm.getToken().then(token => {
        console.log("Received FCM Token: " + token);
      })
      //}

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


  updateTagLastSeen(tagId) {
    var uid = this.afAuth.auth.currentUser.uid;

    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var utc = Date.now().toString();

    tagCollectionRef.doc(tagId).update({ lastseen: utc }).catch(() => {
      console.error("Tag ID " + tagId + " missing from Database");
    });

  }

}

