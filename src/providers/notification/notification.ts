import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FCM } from '@ionic-native/fcm';
import { Toast } from '@ionic-native/toast';

import { ShowPage } from '../../pages/show/show';
import { Platform, NavController, App } from 'ionic-angular';
import { LocationProvider } from '../location/location';
import { UtilsProvider } from '../utils/utils';
import { TagProvider } from '../tag/tag';


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
    fcm: FCM,
    private app: App,
    private loc: LocationProvider,
    private utils: UtilsProvider,
    private toast: Toast) {
    console.log('Hello NotificationProvider Provider');

    platform.ready().then(() => {
        // Get FCM token and update the DB 
        
        fcm.getToken().then(token => {
          console.log("Received FCM Token: " + token);
          this.fcm_token = token;
  
          this.utils.updateTagFCMTokens(token);
        }).catch(() => {
          console.error("Unable to receive FCM token");
        })
  
        fcm.onNotification().subscribe(data => {
          console.log("Notification Received: " + JSON.stringify(data));
  
          this.toast.showWithOptions({
            message: data.aps.alert.body.length > 0 ? data.aps.alert.title + "\n" + data.aps.alert.body : data.aps.alert.title,
            duration: 5000, 
            position: "top",
            addPixelsY: 55,
            
            
            styling: {
              opacity: 0.95, // 0.0 (transparent) to 1.0 (opaque). Default 0.8
              backgroundColor: '#4daf7e', // make sure you use #RRGGBB. Default #333333
              textColor: '#FFFFFF', // Ditto. Default #FFFFFF
              cornerRadius: 5, // minimum is 0 (square). iOS default 20, Android default 100
              horizontalPadding: 70, // iOS default 16, Android default 50
              verticalPadding: 16 // iOS default 12, Android default 30
            }
            
          }).subscribe(
            toast => {
              console.log(JSON.stringify(toast));
            }
          );;

          if (data.wasTapped) {
            if (data.tagId) {
              this.app.getActiveNav().push(ShowPage, data.tagId);
            }
          }
        });  
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
