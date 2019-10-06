var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { takeUntil, catchError, retry } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthProvider } from '../auth/auth';
import { BehaviorSubject, Subscription, Subject, throwError as observableThrowError } from 'rxjs';
import { NativeStorage } from '@ionic-native/native-storage';
var SettingsProvider = /** @class */ (function () {
    function SettingsProvider(http, afs, authProvider, nativeStorage) {
        this.http = http;
        this.afs = afs;
        this.authProvider = authProvider;
        this.nativeStorage = nativeStorage;
        this.settings$ = new BehaviorSubject(null);
        this.authSubscription = new Subscription();
        // Ionic Pro Live Deploy
        this.deployChannel = '';
        this.isBeta = false;
        this.downloadProgress = 0;
        this.win = window;
        this.settings_loaded = false;
        // const subscription = this.afAuth.auth.onAuthStateChanged(user => {
        //   if (user) {
        //     this.init();
        //   }
        // });
        // this.authSubscription.add(subscription);
    }
    SettingsProvider.prototype.init = function () {
        var _this = this;
        console.log('SettingsProvider: Initializing...');
        this.destroyed$ = new Subject();
        this.settings$ = new BehaviorSubject(null);
        this.authProvider
            .getUserInfo()
            .then(function (user) {
            console.log('SettingsProvider: Loading settings for user ' + user.uid);
            _this.userDoc = _this.afs.collection('Users').doc(user.uid);
            var unsub = _this.userDoc
                .valueChanges()
                .pipe(catchError(function (e) { return observableThrowError(e); }), retry(10), takeUntil(_this.destroyed$))
                .subscribe(function (data) {
                console.log('data: ' + JSON.stringify(data));
                var account = data;
                if (account !== null && account.settings !== undefined) {
                    _this.settings = account.settings;
                    _this.settings$.next(_this.settings);
                    _this.settings_loaded = true;
                }
                else {
                    console.error('SettingsProvider: No settings found for user!');
                }
                unsub.unsubscribe();
            }, function (error) {
                console.error('SettingsProvider: Unable to get user settings');
            });
            _this.docSubscription = _this.userDoc
                .valueChanges()
                .pipe(takeUntil(_this.destroyed$))
                .subscribe(function (data) {
                console.log('SettingsProvider: Pushing updated Settings');
                _this.settings$.next(_this.settings);
                _this.settings_loaded = true;
            });
        })
            .catch(function (error) {
            console.error('SettingsProvider: loadSettings(): Unable to load settings, user is not logged in; ' +
                JSON.stringify(error));
        });
    };
    SettingsProvider.prototype.setAccountName = function (name) {
        this.name = name;
    };
    SettingsProvider.prototype.stop = function () {
        console.log('SettingsProvider: Shutting Down...');
        if (this.docSubscription) {
            console.log('SettingsProvider: Unsubscribing from docSubscription');
            this.docSubscription.unsubscribe();
        }
        if (this.destroyed$) {
            this.destroyed$.next();
            this.destroyed$.complete();
        }
        this.settings_loaded = false;
        // this.settings = undefined;
        this.settings$.complete();
    };
    SettingsProvider.prototype.getSettings = function () {
        return this.settings$;
    };
    SettingsProvider.prototype.setRegionNotifications = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.regionNotifications': value });
        });
    };
    SettingsProvider.prototype.setTagNotifications = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.tagNotifications': value });
        });
    };
    SettingsProvider.prototype.setCommunityNotifications = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.communityNotifications': value });
        });
    };
    SettingsProvider.prototype.setCommunityNotificationString = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.communityNotificationString': value });
            _this.settings.communityNotificationString = '';
            // this.settings$.next(this.settings);
        });
    };
    SettingsProvider.prototype.setEnableMonitoring = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.enableMonitoring': value });
        });
    };
    SettingsProvider.prototype.setEnableSensorMode = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.sensor': value });
        });
        if (!value) {
            this.nativeStorage.remove('sensor').then(function (r) {
                console.log("remove sensor", r);
            }).catch(function (e) {
                console.error("remove sensor", JSON.stringify(e));
            });
        }
    };
    SettingsProvider.prototype.setMonitoringFrequency = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.monitoringFrequency': value });
        });
    };
    SettingsProvider.prototype.setShowWelcome = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.showWelcome': value });
        });
    };
    SettingsProvider.prototype.setShareContactInfo = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.shareContactInfo': value });
        });
    };
    SettingsProvider.prototype.setHighAccuracyMode = function (value) {
        var _this = this;
        this.authProvider.getUserId().then(function (uid) {
            var setRef = _this.afs.collection('Users').doc(uid);
            setRef.update({ 'settings.highAccuracyMode': value });
        });
    };
    SettingsProvider.prototype.ngOnDestroy = function () {
        // this.authSubscription.unsubscribe();
    };
    SettingsProvider = __decorate([
        Injectable(),
        __metadata("design:paramtypes", [HttpClient,
            AngularFirestore,
            AuthProvider,
            NativeStorage])
    ], SettingsProvider);
    return SettingsProvider;
}());
export { SettingsProvider };
//# sourceMappingURL=settings.js.map