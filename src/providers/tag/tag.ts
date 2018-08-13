import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';

import { AngularFirestore } from 'angularfire2/firestore';

import { FCM } from '@ionic-native/fcm';
import { Platform } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';
import { NotificationProvider } from '../notification/notification';
import { AuthProvider } from '../auth/auth';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';

import 'rxjs/add/observable/throw';
import { Badge } from '@ionic-native/badge';

export interface Tag {
  id?: string;
  name: string;
  tagId: string;
  breed: any;
  color: any;
  gender: string;
  character: string;
  remarks: string;
  weight: string;
  size: string;
  location: string;
  img: string;
  lastseen: string;
  lastseenBy: string;
  active: boolean;
  lost: boolean;
  markedlost: string;
  markedfound: string;
  uid: string;
  fcm_token?: string;
  hw: {
    batt: string;
  };
  tagattached: boolean;
}

@Injectable()
export class TagProvider implements OnDestroy {
  private notified = {};

  private fcm_subscription: Subscription = new Subscription();
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  tags$: Observable<Tag[]>;
  tag_warnings$: BehaviorSubject<Number> = new BehaviorSubject<Number>(0);

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private platform: Platform,
    private fcm: FCM,
    private utils: UtilsProvider,
    private loc: LocationProvider,
    private notification: NotificationProvider,
    private authProvider: AuthProvider,
    private badge: Badge
  ) {}

  init() {
    console.log('TagProvider: Initializing...');

    this.platform.ready().then(() => {
      this.badge.clear();

      this.fcm_subscription = this.fcm
        .onTokenRefresh()
        .takeUntil(this.destroyed$)
        .subscribe(token => {
          this.utils.updateTagFCMTokens(token);
        });

      // Wait before monitoring tags to make sure all required providers have initialized
      setTimeout(() => {
        this.monitorTags();
      }, 1000);
    });
  }

  monitorTags() {
    console.log('TagProvider: Monitoring initialized');

    this.authProvider
      .getUserId()
      .then(uid => {
        this.afs
          .collection<Tag>('Tags', ref =>
            ref.where('uid', '==', uid).orderBy('tagId', 'desc')
          )
          .valueChanges()
          .catch(error => Observable.throw(error))
          .retry(2)
          .takeUntil(this.destroyed$)
          .subscribe(tags => {
            var warnings = 0;

            tags.forEach(
              tag => {
                if (Date.now() - tag.lastseen > 60 * 60 * 24 * 1000) {
                  warnings++;
                }
              },
              error => {
                console.error('monitorTags(): ' + JSON.stringify(error));
              }
            );

            // Set application icon badge
            this.badge.set(warnings).catch(e => {
              console.error('Unable to set badge: ' + e);
            });

            this.tag_warnings$.next(warnings);
          });
      })
      .catch(e => {
        console.error(
          'TagProvider: monitorTags: Unable to get User ID: ' +
            JSON.stringify(e)
        );
      });
  }

  getTagWarnings() {
    return this.tag_warnings$;
  }

  stop() {
    console.log('TagProvider: Shutting Down...');

    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.tag_warnings$.complete();
    this.fcm_subscription.unsubscribe();
  }
  ngOnDestroy() {
    this.stop();
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

  updateTagBattery(tagId, batt) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    tagCollectionRef
      .doc(tagId)
      .update({ 'hw.batt': batt })
      .catch(() => {
        console.error(
          'updateTagBattery(): Tag ID ' + tagId + ' missing from Database'
        );
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

        this.authProvider.getUserId().then(uid => {
          tagCollectionRef
            .doc(paddedId)
            .update({
              location: locationStr,
              lastseen: utc,
              lastseenBy: uid
            })
            .catch(error => {
              console.error(
                'updateTagData:  Unable to update Tag ' +
                  paddedId +
                  ': ' +
                  error
              );
            });
        });
      })
      .catch(error => {
        console.error('updateTagData: Unable to get location: ' + error);
      });
  }
}
