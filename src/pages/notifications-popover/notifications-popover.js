var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { throwError as observableThrowError, ReplaySubject } from 'rxjs';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { NotificationProvider } from '../../providers/notification/notification';
import { AngularFirestore } from '@angular/fire/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
import moment from 'moment';
import { AuthProvider } from '../../providers/auth/auth';
import { catchError, retry, map } from 'rxjs/operators';
import { MarkerProvider } from '../../providers/marker/marker';
var NotificationsPopoverPage = /** @class */ (function () {
    function NotificationsPopoverPage(navCtrl, navParams, notificationsProvider, afs, utilsProvider, authProvider, markerProvider) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.notificationsProvider = notificationsProvider;
        this.afs = afs;
        this.utilsProvider = utilsProvider;
        this.authProvider = authProvider;
        this.markerProvider = markerProvider;
        this.destroyed$ = new ReplaySubject(1);
        this.destroyed$ = new ReplaySubject(1);
        this.authProvider.getUserId().then(function (uid) {
            _this.notifications$ = _this.afs
                .collection('Users')
                .doc(uid)
                .collection('notifications')
                .snapshotChanges()
                .pipe(catchError(function (e) { return observableThrowError(e); }), retry(2))
                .takeUntil(_this.destroyed$)
                .pipe(map(function (actions) {
                return actions
                    .map(function (a) {
                    var data = a.payload.doc.data();
                    var id = a.payload.doc.id;
                    return __assign({ id: id }, data);
                })
                    .sort(function (a, b) {
                    return Number(b.id) - Number(a.id);
                })
                    .slice(0, 15);
            }));
        });
    }
    NotificationsPopoverPage.prototype.notificationAction = function (data) {
        console.log(JSON.stringify(data));
        if (data.function !== '') {
            switch (data.function) {
                case 'show_marker':
                    this.markerProvider.showSingleMarker(data.tagId, true);
                    // Switch to Map Tab
                    this.navCtrl.parent.select(0);
                    break;
                case 'show_location':
                    this.markerProvider.showSingleMarker(data.location, false);
                    // Switch to Map Tab
                    this.navCtrl.parent.select(0);
                    break;
                case 'lost_pet':
                    // this.markerProvider.showInfoPopover(data.tagId);
                    this.navCtrl.push('ShowPage', {
                        tagId: data.tagId,
                        anonymous: false
                    });
                    // Switch to Map Tab
                    // this.navCtrl.parent.select(0);
                    break;
            }
        }
    };
    NotificationsPopoverPage.prototype.ionViewDidLoad = function () {
        console.log('ionViewDidLoad NotificationsPopoverPage');
    };
    NotificationsPopoverPage.prototype.showTime = function (timestamp) {
        return moment.unix(timestamp / 1000).fromNow();
    };
    NotificationsPopoverPage.prototype.ngOnDestroy = function () {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    };
    NotificationsPopoverPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-notifications-popover',
            templateUrl: 'notifications-popover.html'
        }),
        __metadata("design:paramtypes", [NavController,
            NavParams,
            NotificationProvider,
            AngularFirestore,
            UtilsProvider,
            AuthProvider,
            MarkerProvider])
    ], NotificationsPopoverPage);
    return NotificationsPopoverPage;
}());
export { NotificationsPopoverPage };
//# sourceMappingURL=notifications-popover.js.map