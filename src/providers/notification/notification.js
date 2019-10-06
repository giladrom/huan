var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FCM } from '@ionic-native/fcm';
import { Toast } from '@ionic-native/toast';
import { Platform, App, PopoverController } from 'ionic-angular';
import { LocationProvider } from '../location/location';
import { MarkerProvider } from '../marker/marker';
import { ReplaySubject } from 'rxjs';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthProvider } from '../auth/auth';
import firebase from 'firebase';
import { isArray } from 'util';
import { AppModule } from '../../app/app.module';
import { MixpanelPeople } from '@ionic-native/mixpanel';
var NotificationProvider = /** @class */ (function () {
    function NotificationProvider(http, platform, app, loc, toast, popoverCtrl, markerProvider, afs, authProvider, mixpanelPeople) {
        this.http = http;
        this.platform = platform;
        this.app = app;
        this.loc = loc;
        this.toast = toast;
        this.popoverCtrl = popoverCtrl;
        this.markerProvider = markerProvider;
        this.afs = afs;
        this.authProvider = authProvider;
        this.mixpanelPeople = mixpanelPeople;
        this.notifications$ = new ReplaySubject();
        this.notificationsArray = [];
        this.destroyed$ = new ReplaySubject(1);
        // private uid = undefined;
        this.httpHeaders = {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                Authorization: 'key=AAAAfohSsTM:APA91bF5_WYeGZkCsdzF7Raa2InMaIbosAeZ1rLR8BCXW9D6VxcY82-XjHbct6VY76T5fyeu69U3BqtPsGWCcJwn1WqkCDnthiVe5ZpoIrEw3owmaS1uS4tV9xaTedtk4WBiJ36IkNQm'
            })
        };
    }
    NotificationProvider.prototype.init = function () {
        // this.authProvider.getUserId().then(uid => {
        //   this.uid = uid;
        // });
        var _this = this;
        // Update Tokens in the DB whenever we resume the app
        this.platform.resume.subscribe(function (e) {
            _this.updateTokens();
        });
        this.platform.ready().then(function () {
            _this.fcm = AppModule.injector.get(FCM);
            _this.updateTokens();
            _this.subscription = _this.fcm
                .onNotification()
                .pipe(takeUntil(_this.destroyed$))
                .subscribe(function (data) {
                console.log('Notification Received: ' + JSON.stringify(data));
                _this.notificationsArray.push({
                    title: data.title,
                    body: data.body,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                _this.notifications$.next([
                    {
                        title: data.title,
                        body: data.body,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }
                ]);
                if (data.wasTapped) {
                    _this.handleNotification(data);
                }
                else {
                    _this.toast
                        .showWithOptions({
                        message: data.title + "\n" + data.body,
                        duration: 5000,
                        position: 'center'
                    })
                        .subscribe(function (toast) {
                        console.log(JSON.stringify(toast));
                        if (toast && toast.event) {
                            if (toast.event === 'touch') {
                                _this.handleNotification(data);
                            }
                        }
                    });
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
    };
    NotificationProvider.prototype.handleNotification = function (data) {
        if (data.function) {
            switch (data.function) {
                case 'show_marker':
                    // this.markerProvider.showSingleMarker(data.location);
                    this.markerProvider.showSingleMarker(data.tagId, true);
                    // Switch to Map Tab
                    this.app.getActiveNav().parent.select(0);
                    break;
                case 'show_location':
                    this.markerProvider.showSingleMarker(data.location, false);
                    break;
                case 'lost_pet':
                    this.app.getRootNav().push('ShowPage', {
                        tagId: data.tagId,
                        anonymous: false
                    });
                    // this.markerProvider.showInfoPopover(data.tagId);
                    break;
            }
        }
    };
    NotificationProvider.prototype.pad = function (n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    };
    NotificationProvider.prototype.updateTagFCMTokens = function (token) {
        // token = token.split(':').pop();
        var _this = this;
        this.authProvider
            .getUserId()
            .then(function (uid) {
            var tagCollectionRef = _this.afs.collection('Tags');
            var query = tagCollectionRef.ref.where('uid', 'array-contains', uid);
            query.get().then(function (data) {
                data.forEach(function (element) {
                    console.log('*** Updating Tokens for tag ' +
                        JSON.stringify(element.data().tagId) +
                        ' with token ' +
                        JSON.stringify(token));
                    var tagId = _this.pad(element.data().tagId, 4, '0');
                    var tag = element.data();
                    // Add our FCM token to the FCM token arrays. Convert to array if using old format.
                    var uid_token = {
                        uid: uid,
                        token: token
                    };
                    if (isArray(tag.fcm_token)) {
                        var found = false;
                        tag.fcm_token.forEach(function (t) {
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
                    }
                    else {
                        console.warn('Generating new fcm_tokens');
                        tag.fcm_token = new Array();
                        tag.fcm_token.push(uid_token);
                    }
                    console.warn('Updating FCM token: ' + JSON.stringify(tag.fcm_token));
                    tagCollectionRef
                        .doc(tagId)
                        .update({
                        fcm_token: tag.fcm_token
                    })
                        .catch(function (error) {
                        console.error('Unable to update FCM token for tag ' + tagId + ': ' + error);
                    });
                });
            });
        })
            .catch(function (error) {
            console.error('updateTagFCMTokens: ' + JSON.stringify(error));
        });
    };
    NotificationProvider.prototype.updateTokens = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // Get FCM token and update the DB
            console.log('Updating FCM Token...');
            _this.fcm
                .getToken()
                .then(function (token) {
                if (token != null) {
                    console.log('Received FCM Token: ' + token);
                    _this.fcm_token = token;
                    _this.mixpanelPeople
                        .setPushId(_this.fcm_token)
                        .then(function () {
                        console.log('Mixpanel People Push Id set successfully');
                    })
                        .catch(function (e) {
                        console.error('Mixpanel People Push Id', e);
                    });
                    _this.updateTagFCMTokens(token);
                    resolve(token);
                }
                else {
                    console.error('Received null FCM token, retrying...');
                    setTimeout(function () {
                        resolve(_this.updateTokens());
                    }, 2000);
                }
            })
                .catch(function (error) {
                console.error('Unable to receive FCM token', error);
                reject(error);
            });
        });
    };
    NotificationProvider.prototype.subscribeToCommunity = function (name) {
        var _this = this;
        if (name === void 0) { name = ''; }
        return new Promise(function (resolve, reject) {
            if (!name) {
                console.warn('subscribeToCommunity: no community string found.');
            }
            else {
                console.log('subscribeToCommunity: Existing community string found: ' + name);
                _this.fcm
                    .subscribeToTopic(name)
                    .then(function (res) {
                    resolve(name);
                    console.log('Successfully subscribed to community notifications: ' +
                        name +
                        ': ' +
                        res);
                })
                    .catch(function (e) {
                    reject(e);
                    console.error('Unable to subscribe to community notifications: ' +
                        name +
                        ' :' +
                        e);
                });
            }
        });
    };
    NotificationProvider.prototype.unsubscribeFromCommunity = function (topic) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.fcm
                .unsubscribeFromTopic(topic)
                .then(function (res) {
                console.log('Successfully unsubscribed from community notifications: ' + topic);
                resolve(res);
            })
                .catch(function (e) {
                console.error('Unable to unsubscribe from community notifications: ' +
                    topic +
                    ' :' +
                    e);
                reject(e);
            });
        });
    };
    NotificationProvider.prototype.sendNotification = function (notification) {
        //this.platform.ready().then(() => {
        console.warn('Sending Notifiation', JSON.stringify(notification));
        this.http
            .post('https://fcm.googleapis.com/fcm/send', notification, this.httpHeaders)
            .subscribe(function (data) {
            console.log('Success: ' + JSON.stringify(data));
        }, function (error) {
            console.log('Error: ' + JSON.stringify(error));
        });
        //})
    };
    NotificationProvider.prototype.sendRemoteFoundNotification = function (petName, foundBy, tagId, destinationToken) {
        var _this = this;
        this.loc.getLocationName().then(function (locationStr) {
            var town = locationStr[0].locality + ', ' + locationStr[0].administrativeArea;
            var remoteFoundNotification = {
                notification: {
                    title: 'Your lost pet, ' + petName + ', has been located!',
                    body: 'Near ' + town,
                    sound: 'default',
                    click_action: 'FCM_PLUGIN_ACTIVITY',
                    icon: 'fcm_push_icon'
                },
                data: {
                    foundBy: foundBy,
                    tagId: tagId,
                    type: 'remoteFoundNotification'
                },
                to: destinationToken,
                priority: 'high',
                restricted_package_name: ''
            };
            console.log('Sending notification:  ' + remoteFoundNotification);
            _this.sendNotification(remoteFoundNotification);
        });
    };
    NotificationProvider.prototype.sendLocalFoundNotification = function (tagId) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var localFoundNotification = {
                notification: {
                    title: 'A lost pet has been detected nearby!',
                    body: 'Owners have been notified.',
                    sound: 'default',
                    click_action: 'FCM_PLUGIN_ACTIVITY',
                    icon: 'fcm_push_icon'
                },
                data: {
                    foundBy: uid,
                    tagId: tagId,
                    type: 'localFoundNotification'
                },
                to: _this.fcm_token,
                priority: 'high',
                restricted_package_name: ''
            };
            _this.sendNotification(localFoundNotification);
        });
    };
    NotificationProvider.prototype.sendLocalNotification = function (title, body) {
        var localNotification = {
            notification: {
                title: title,
                body: body,
                sound: 'default',
                click_action: 'FCM_PLUGIN_ACTIVITY',
                icon: 'fcm_push_icon'
            },
            data: {
                type: 'localNotification'
            },
            to: this.fcm_token,
            priority: 'high',
            restricted_package_name: ''
        };
        this.sendNotification(localNotification);
    };
    NotificationProvider.prototype.sendRemoteNotification = function (title, body, token) {
        var payload = {
            notification: {
                title: title,
                body: body,
                sound: 'default',
                click_action: 'FCM_PLUGIN_ACTIVITY',
                icon: 'fcm_push_icon'
            },
            data: {
                title: title,
                body: body
            },
            to: token
        };
        this.sendNotification(payload);
    };
    NotificationProvider.prototype.getFCMToken = function () {
        return this.fcm_token;
    };
    NotificationProvider.prototype.showNotificationsPopover = function (event) {
        var popover = this.popoverCtrl.create('NotificationsPopoverPage', {}, {
            enableBackdropDismiss: true,
            cssClass: 'show-notifications-popover'
        });
        popover.present({ ev: event });
    };
    NotificationProvider.prototype.getNotifications = function () {
        return this.notifications$.asObservable();
    };
    NotificationProvider.prototype.clearNotifications = function () {
        this.notifications$.complete();
        this.notifications$ = new ReplaySubject();
    };
    NotificationProvider.prototype.stop = function () {
        this.destroyed$.next(true);
        this.destroyed$.complete();
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    };
    NotificationProvider.prototype.ngOnDestroy = function () {
        this.stop();
    };
    NotificationProvider = __decorate([
        Injectable(),
        __metadata("design:paramtypes", [HttpClient,
            Platform,
            App,
            LocationProvider,
            Toast,
            PopoverController,
            MarkerProvider,
            AngularFirestore,
            AuthProvider,
            MixpanelPeople])
    ], NotificationProvider);
    return NotificationProvider;
}());
export { NotificationProvider };
//# sourceMappingURL=notification.js.map