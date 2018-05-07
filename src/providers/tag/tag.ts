import {
  HttpClient
  // HttpHeaders
} from '@angular/common/http';
import {
  Injectable,
  // ViewChild,
  OnDestroy
} from '@angular/core';

import {
  AngularFirestore
  // AngularFirestoreCollection
} from 'angularfire2/firestore';

// import { Observable } from 'rxjs/Observable';
import { AngularFireAuth } from 'angularfire2/auth';
import { FCM } from '@ionic-native/fcm';
import {
  Platform,
  // NavController,
  App
} from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';
// import { ShowPage } from '../../pages/show/show';
import { NotificationProvider } from '../notification/notification';

// declare let cordova: any;

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
  //private fcm_token: string;
  private notified = {};

  private fcm_subscription: any;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    // private afAuth: AngularFireAuth,
    private platform: Platform,
    fcm: FCM,
    private utils: UtilsProvider,
    private loc: LocationProvider,
    // private app: App,
    private notification: NotificationProvider
  ) {
    console.log('Hello TagProvider Provider');

    platform.ready().then(() => {
      this.fcm_subscription = fcm.onTokenRefresh().subscribe(token => {
        this.utils.updateTagFCMTokens(token);
      });
    });
  }

  ngOnDestroy() {
    this.fcm_subscription.unsubscribe();
  }

  notifyIfLost(tagId) {
    //this.platform.ready().then(() => {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var paddedId = this.utils.pad(tagId, 4, '0');

    var lost: boolean;

    tagCollectionRef
      .doc(paddedId)
      .ref.get()
      .then(data => {
        lost = Boolean(data.get('lost'));
        var utc = Date.now();
        var lastSeen = new Number(data.get('lastseen'));

        // var timeDelta = utc - lastSeen.valueOf();
        //console.log(paddedId + " Time Delta: " + timeDelta);

        // If found dog is marked as lost, send a notification
        if (lost == true && this.notified[tagId] != 'true') {
          // Alert local app that a lost pet was seen nearby
          this.notification.sendLocalFoundNotification(data.get('tagId'));

          // Alert remote app that lost pet has been located
          this.utils.getUserId().then(uid => {
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
    //})
  }

  updateTagLastSeen(tagId) {
    //this.platform.ready().then(() => {

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
    //})
  }

  updateTagLocation(tagId) {
    //this.platform.ready().then(() => {

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
    //})
  }

  updateTagData(tagId) {
    try {
      var tagCollectionRef = this.afs.collection<Tag>('Tags');

      var locationStr = '';
      this.loc.getLocation().then(res => {
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
            console.error('Unable to update Tag ' + paddedId + ': ' + error);
          });
      });
    } catch (error) {
      console.error('updateTagData: ' + error);
    }
  }
}
