import { takeUntil } from "rxjs/operators";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable, OnDestroy } from "@angular/core";
import { Toast } from "@ionic-native/toast";
import { Platform, App, PopoverController } from "ionic-angular";
import { LocationProvider } from "../location/location";
import { MarkerProvider } from "../marker/marker";
import { ReplaySubject, Observable } from "rxjs";
import { AngularFirestore } from "@angular/fire/firestore";
import { AuthProvider } from "../auth/auth";
import { Subscription } from "../../../node_modules/rxjs/Subscription";
import * as firebase from "firebase/app";
import "firebase/firestore";

import { isArray } from "util";
import { Tag } from "../tag/tag";
import { Mixpanel, MixpanelPeople } from "@ionic-native/mixpanel";

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
      "Content-Type": "application/json",
      Authorization:
        "key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm",
    }),
  };

  private subscription: Subscription;

  constructor(
    public http: HttpClient,
    private platform: Platform,
    private app: App,
    private loc: LocationProvider,
    private toast: Toast,
    private popoverCtrl: PopoverController,
    private markerProvider: MarkerProvider,
    private afs: AngularFirestore,
    private authProvider: AuthProvider,
    private mixpanelPeople: MixpanelPeople,
    private mixpanel: Mixpanel
  ) {
    console.warn("### NotificationProvider Initializing...");
  }

  init() {
    // this.authProvider.getUserId().then(uid => {
    //   this.uid = uid;
    // });

    // Update Tokens in the DB whenever we resume the app
    this.platform.resume.subscribe((e) => {
      this.updateTokens();
    });

    this.platform.ready().then(() => {
      this.updateTokens();

      this.subscription = this.onNotificationOpen()
        .pipe(takeUntil(this.destroyed$))
        .subscribe((notification) => {
          var data: any = notification;

          console.log("Notification Received: " + JSON.stringify(data));

          this.notificationsArray.push({
            title: data.title,
            body: data.body,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });

          this.notifications$.next([
            {
              title: data.title,
              body: data.body,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            },
          ]);

          if (data.tap && data.tap == "background") {
            console.log("Background notification tap detected");
            this.handleNotification(data);
          } else {
            if (data.title) {
              this.toast
                .showWithOptions({
                  message: `${data.title}\n${data.body}`,
                  duration: 5000,
                  position: "center",
                })
                .subscribe((toast) => {
                  console.log(JSON.stringify(toast));

                  if (toast && toast.event) {
                    if (toast.event === "touch") {
                      this.handleNotification(data);
                    }
                  }
                });
            }

            // if (data.function === 'coowner_permission') {
            //   this.showCoOwnerConfirmDialog(
            //     'Confirm Request',
            //     data.body,
            //     data.uid,
            //     data.tagId
            //   );
            // }
          }
        });
    });
  }

  onNotificationOpen() {
    return new Observable((observer) => {
      (window as any).FirebasePlugin.onMessageReceived((response) => {
        this.mixpanel
          .track("received_notification")
          .then(() => { })
          .catch((e) => {
            console.error("Mixpanel Error", e);
          });

        observer.next(response);
      });
    });
  }

  handleNotification(data) {
    try {
      if (data.aps.function) {
        switch (data.function) {
          case "show_marker":
            // this.markerProvider.showSingleMarker(data.location);
            this.markerProvider.showSingleMarker(data.aps.tagId, true);
            // Switch to Map Tab
            this.app.getActiveNav().parent.select(0);
            break;

          case "show_location":
            this.markerProvider.showSingleMarker(data.aps.location, false);
            break;

          case "lost_pet":
            this.app.getRootNav().push("ShowPage", {
              tagId: data.aps.tagId,
              anonymous: false,
            });

            // this.markerProvider.showInfoPopover(data.tagId);
            break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  pad(n, width, z): string {
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  updateTagFCMTokens(token) {
    // token = token.split(':').pop();

    this.authProvider
      .getUserId()
      .then((uid) => {
        var tagCollectionRef = this.afs.collection<Tag>("Tags");
        var query = tagCollectionRef.ref.where("uid", "array-contains", uid);
        query.get().then((data) => {
          data.forEach((element) => {
            console.log(
              "*** Updating Tokens for tag " +
              JSON.stringify(element.data().tagId) +
              " with token " +
              JSON.stringify(token)
            );
            var tagId = this.pad(element.data().tagId, 4, "0");

            const tag: Tag = <Tag>element.data();

            // Add our FCM token to the FCM token arrays. Convert to array if using old format.

            var uid_token = {
              uid: uid,
              token: token,
            };

            if (isArray(tag.fcm_token)) {
              var found = false;

              tag.fcm_token.forEach((t) => {
                // console.warn(JSON.stringify(t));

                if (t.uid === uid) {
                  t.token = token;
                  found = true;
                }
              });

              if (!found) {
                console.warn("Couldn't find our UID, adding new");
                tag.fcm_token.push(uid_token);
              }
            } else {
              console.warn("Generating new fcm_tokens");

              tag.fcm_token = new Array();
              tag.fcm_token.push(uid_token);
            }

            console.warn(
              "Updating FCM token: " + JSON.stringify(tag.fcm_token)
            );

            tagCollectionRef
              .doc(tagId)
              .update({
                fcm_token: tag.fcm_token,
              })
              .catch((error) => {
                console.error(
                  "Unable to update FCM token for tag " + tagId + ": " + error
                );
              });
          });
        });
      })
      .catch((error) => {
        console.error("updateTagFCMTokens: " + JSON.stringify(error));
      });
  }

  updateTokens(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get FCM token and update the DB
      console.log("Updating FCM Token...");

      (<any>window).FirebasePlugin.getToken((token) => {
        if (token != null) {
          console.log("Received FCM Token: " + token);
          this.fcm_token = token;

          this.mixpanelPeople
            .setPushId(this.fcm_token)
            .then(() => {
              console.log("Mixpanel People Push Id set successfully");
            })
            .catch((e) => {
              console.error("Mixpanel People Push Id", e);
            });

          this.updateTagFCMTokens(token);
          resolve(token);
        } else {
          console.error("Received null FCM token, retrying...");

          setTimeout(() => {
            resolve(this.updateTokens());
          }, 2000);
        }
      })
      // .catch((error) => {
      //   console.error("Unable to receive FCM token", error);
      //   reject(error);
      // });
    });
  }

  subscribeToCommunity(name = "") {
    return new Promise<any>((resolve, reject) => {
      if (!name) {
        console.warn("subscribeToCommunity: no community string found.");
      } else {
        console.log(
          "subscribeToCommunity: Existing community string found: " + name
        );

        resolve((window as any).FirebasePlugin.subscribe(name));

        // .then(res => {
        //   resolve(name);
        //   console.log(
        //     "Successfully subscribed to community notifications: " +
        //       name +
        //       ": " +
        //       res
        //   );
        // })
        // .catch(e => {
        //   reject(e);
        //   console.error(
        //     "Unable to subscribe to community notifications: " +
        //       name +
        //       " :" +
        //       e
        //   );
        // });
      }
    });
  }

  unsubscribeFromCommunity(topic) {
    return new Promise<any>((resolve, reject) => {
      resolve((window as any).FirebasePlugin.unsubscribe(topic));
      // .then(res => {
      //   console.log(
      //     "Successfully unsubscribed from community notifications: " + topic
      //   );

      //   resolve(res);
      // })
      // .catch(e => {
      //   console.error(
      //     "Unable to unsubscribe from community notifications: " +
      //       topic +
      //       " :" +
      //       e
      //   );

      //   reject(e);
      // });
    });
  }

  sendNotification(notification) {
    //this.platform.ready().then(() => {
    console.warn("Sending Notifiation", JSON.stringify(notification));

    this.http
      .post(
        "https://fcm.googleapis.com/fcm/send",
        notification,
        this.httpHeaders
      )
      .subscribe(
        (data) => {
          console.log("Success: " + JSON.stringify(data));
        },
        (error) => {
          console.log("Error: " + JSON.stringify(error));
        }
      );
    //})
  }

  sendRemoteFoundNotification(petName, foundBy, tagId, destinationToken) {
    this.loc.getLocationName().then((locationStr) => {
      var town =
        locationStr[0].locality + ", " + locationStr[0].administrativeArea;

      var remoteFoundNotification = {
        notification: {
          title: "Your lost pet, " + petName + ", has been located!",
          body: "Near " + town,
          sound: "default",
          click_action: "FCM_PLUGIN_ACTIVITY",
          icon: "fcm_push_icon",
        },
        data: {
          foundBy: foundBy,
          tagId: tagId,
          type: "remoteFoundNotification",
        },
        to: destinationToken,
        priority: "high",
        restricted_package_name: "",
      };

      console.log("Sending notification:  " + remoteFoundNotification);

      this.sendNotification(remoteFoundNotification);
    });
  }

  sendLocalFoundNotification(tagId) {
    this.authProvider.getUserId().then((uid) => {
      // var localFoundNotification = {
      //   notification: {
      //     title: "A lost pet has been detected nearby!",
      //     body: "Owners have been notified.",
      //     sound: "default",
      //     click_action: "FCM_PLUGIN_ACTIVITY",
      //     icon: "fcm_push_icon",
      //   },
      //   data: {
      //     foundBy: uid,
      //     tagId: tagId,
      //     type: "localFoundNotification",
      //   },
      //   to: this.fcm_token,
      //   priority: "high",
      //   restricted_package_name: "",
      // };

      (window as any).cordova.plugins.notification.local.schedule({
        title: "A lost pet has been detected nearby!",
        text: "Owners have been notified.",
        foreground: true,
      });

      // this.sendNotification(localFoundNotification);
    });
  }

  sendLocalNotification(title, body) {
    // var localNotification = {
    //   notification: {
    //     title: title,
    //     body: body,
    //     sound: "default",
    //     click_action: "FCM_PLUGIN_ACTIVITY",
    //     icon: "fcm_push_icon",
    //   },
    //   data: {
    //     type: "localNotification",
    //   },
    //   to: this.fcm_token,
    //   priority: "high",
    //   restricted_package_name: "",
    // };

    (window as any).cordova.plugins.notification.local.schedule({
      title: title,
      text: body,
      foreground: true,
    });

    // this.sendNotification(localNotification);
  }

  sendRemoteNotification(title, body, token) {
    const payload = {
      notification: {
        title: title,
        body: body,
        sound: "default",
        click_action: "FCM_PLUGIN_ACTIVITY",
        icon: "fcm_push_icon",
      },
      data: {
        title: title,
        body: body,
      },
      to: token,
    };

    this.sendNotification(payload);
  }

  getFCMToken() {
    return this.fcm_token;
  }

  showNotificationsPopover(event) {
    let popover = this.popoverCtrl.create(
      "NotificationsPopoverPage",
      {},
      {
        enableBackdropDismiss: true,
        cssClass: "show-notifications-popover",
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
