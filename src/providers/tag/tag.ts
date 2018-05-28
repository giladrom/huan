import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';

import { AngularFirestore } from 'angularfire2/firestore';

import { FCM } from '@ionic-native/fcm';
import { Platform } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';
import { NotificationProvider } from '../notification/notification';
import { AuthProvider } from '../auth/auth';

export interface Tag {
  id?: string;
  name: string;
  tagId: string;
  breed: string;
  color: string;
  gender: string;
  character: string;
  remarks: string;
  weight: string;
  size: string;
  location: string;
  img: string;
  lastseen: string;
  active: boolean;
  lost: boolean;
  markedlost: string;
  markedfound: string;
  uid: string;
  fcm_token?: string;
}

@Injectable()
export class TagProvider implements OnDestroy {
  private notified = {};

  private fcm_subscription: any;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private platform: Platform,
    fcm: FCM,
    private utils: UtilsProvider,
    private loc: LocationProvider,
    private notification: NotificationProvider,
    private authProvider: AuthProvider
  ) {
    console.log('Hello TagProvider Provider');

    this.platform.ready().then(() => {
      this.fcm_subscription = fcm.onTokenRefresh().subscribe(token => {
        this.utils.updateTagFCMTokens(token);
      });
    });
  }

  ngOnDestroy() {
    this.fcm_subscription.unsubscribe();
  }

  notifyIfLost(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var paddedId = this.utils.pad(tagId, 4, '0');

    var lost: boolean;

    tagCollectionRef
      .doc(paddedId)
      .ref.get()
      .then(data => {
        lost = Boolean(data.get('lost'));

        // If found dog is marked as lost, send a notification
        if (lost == true && this.notified[tagId] != 'true') {
          // Alert local app that a lost pet was seen nearby
          this.notification.sendLocalFoundNotification(data.get('tagId'));

          // Alert remote app that lost pet has been located
          this.authProvider.getUserId().then(uid => {
            this.notification.sendRemoteFoundNotification(
              data.get('name'),
              uid,
              data.get('tagId'),
              data.get('fcm_token')
            );
          });
        }
      })
      .catch(() => {
        console.error('Tag ID ' + paddedId + ' missing from Database');
      });
  }

  updateTagLastSeen(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var utc = Date.now().toString();

    tagCollectionRef
      .doc(this.utils.pad(tagId, 4, '0'))
      .update({ lastseen: utc })
      .catch(() => {
        console.error(
          'Tag ID ' + this.utils.pad(tagId, 4, '0') + ' missing from Database'
        );
      });
  }

  updateTagLocation(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc.getLocation().then(res => {
      locationStr = String(res);

      var paddedId = this.utils.pad(tagId, 4, '0');

      tagCollectionRef
        .doc(paddedId)
        .update({ location: locationStr })
        .catch(() => {
          console.error('Tag ID ' + paddedId + ' missing from Database');
        });
    });
  }

  updateTagData(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc
      .getLocation()
      .then(res => {
        locationStr = String(res);

        var paddedId = this.utils.pad(tagId, 4, '0');
        var utc = Date.now().toString();

        tagCollectionRef
          .doc(paddedId)
          .update({
            location: locationStr,
            lastseen: utc
          })
          .catch(error => {
            console.error(
              'updateTagData:  Unable to update Tag ' + paddedId + ': ' + error
            );
          });
      })
      .catch(error => {
        console.error('updateTagData: Unable to get location: ' + error);
      });
  }
}
