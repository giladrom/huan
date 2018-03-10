import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FCM } from '@ionic-native/fcm';
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
    platform: Platform,
    fcm: FCM,
    private app: App,
    private loc: LocationProvider,
    private utils: UtilsProvider) {
    console.log('Hello NotificationProvider Provider');

    platform.ready().then(() => {
      // Enable FCM Notifications
      fcm.getToken().then(token => {
        console.log("Received FCM Token: " + token);
        this.fcm_token = token;


      }).catch(() => {
        console.error("Unable to receive FCM token");
      })

      fcm.onNotification().subscribe(data => {
        console.log("Notification Received");

        if (data.wasTapped) {
          if (data.tagId) {
            this.app.getActiveNav().push(ShowPage, data.tagId);
          }
        }
      });

      /*
      fcm.onTokenRefresh().subscribe(token => {
        console.log("Refreshed FCM Token: " + token);
      })
      */
    })

  }

  sendNotification(notification) {
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
    var localNotification = {
      "notification": {
        "title": title,
        "body": body,
        "sound": "default",
        "click_action": "FCM_PLUGIN_ACTIVITY",
        "icon": "fcm_push_icon"
      },
      "data": {

        "type": "localNotification"
      },
      "to": this.fcm_token,
      "priority": "high",
      "restricted_package_name": ""
    }

    this.sendNotification(localNotification);
  }

  getFCMToken() {
    return this.fcm_token;
  }
}
