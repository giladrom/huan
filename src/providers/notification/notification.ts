import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
//import { FCM } from '@ionic-native/fcm';
import { LocalNotifications } from '@ionic-native/local-notifications';

import { ShowPage } from '../../pages/show/show';
import { Platform, NavController, App } from 'ionic-angular';
import { LocationProvider } from '../location/location';
import { UtilsProvider } from '../utils/utils';


@Injectable()
export class NotificationProvider {
  private fcm_token: string;

  private httpHeaders = {
    headers: new HttpHeaders(
      {
        'Content-Type': 'application/json',
        'Authorization': 'key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm'
      }
    )
  }

  constructor(public http: HttpClient,
    private platform: Platform,
    private localNotifications: LocalNotifications,
    private app: App,
    private loc: LocationProvider,
    private utils: UtilsProvider) {
    console.log('Hello NotificationProvider Provider');

    platform.ready().then(() => {
    })

  }

  sendNotification(notification) {
    //this.platform.ready().then(() => {
      this.http.post(
        "https://fcm.googleapis.com/fcm/send",
        notification,
        this.httpHeaders
      ).subscribe(
        data => {
          console.log("Success: " + JSON.stringify(data));
        },
        error => {
          console.log("Error: " + JSON.stringify(error));
        }
      )
    //})
  }

  sendRemoteFoundNotification(petName, foundBy, tagId, destinationToken) {
    this.loc.getLocationName().then(locationStr => {
      var town = locationStr[0].locality + ', ' + locationStr[0].administrativeArea;

      var remoteFoundNotification = {
        "notification": {
          "title": "Your lost pet, " + petName + ", has been located!",
          "body": "Near " + town,
          "sound": "default",
          "click_action": "FCM_PLUGIN_ACTIVITY",
          "icon": "fcm_push_icon"
        },
        "data": {
          "foundBy": foundBy,
          "tagId": tagId,
          "type": "remoteFoundNotification"
        },
        "to": destinationToken,
        "priority": "high",
        "restricted_package_name": ""
      }


      console.log("Sending notification:  " + remoteFoundNotification);

      this.sendNotification(remoteFoundNotification);
    })
  }

  sendLocalFoundNotification(tagId) {
    this.utils.getUserId().then(uid => {
      var localFoundNotification = {
        "notification": {
          "title": "A lost pet has been detected nearby!",
          "body": "Owners have been notified.",
          "sound": "default",
          "click_action": "FCM_PLUGIN_ACTIVITY",
          "icon": "fcm_push_icon"
        },
        "data": {
          "foundBy": uid,
          "tagId": tagId,
          "type": "localFoundNotification"
        },
        "to": this.fcm_token,
        "priority": "high",
        "restricted_package_name": ""
      }

      this.sendNotification(localFoundNotification);
    })
  }

  sendLocalNotification(title, body) {
    this.localNotifications.schedule({
      title: title,
      text: body,
    });
  }

  getFCMToken() {
    return this.fcm_token;
  }
}
