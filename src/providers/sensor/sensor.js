var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocationProvider } from '../location/location';
import { AuthProvider } from '../auth/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Platform } from 'ionic-angular';
import { NativeStorage } from '@ionic-native/native-storage';
import firebase from 'firebase';
var SensorProvider = /** @class */ (function () {
    function SensorProvider(http, afs, locationProvider, authProvider, platform, nativeStorage) {
        this.http = http;
        this.afs = afs;
        this.locationProvider = locationProvider;
        this.authProvider = authProvider;
        this.platform = platform;
        this.nativeStorage = nativeStorage;
    }
    SensorProvider.prototype.init = function () {
        var _this = this;
        console.log('SensorProvider: Initializing...');
        if (this.platform.is('android')) {
            this.nativeStorage
                .setItem('sensor', true)
                .then(function () {
                console.log('Enabled Sensor Mode in persistent storage');
            })
                .catch(function (e) {
                console.error('Unable to enable Sensor Mode: ' + e);
            });
        }
        this.authProvider.getUserId().then(function (uid) {
            _this.timer = setInterval(function () {
                console.log("SensorProvider: Updating Location...");
                _this.locationProvider.getLocation().then(function (location) {
                    console.log("SensorProvider: Location", location, uid);
                    _this.afs.collection('Sensors')
                        .doc(uid)
                        .set({
                        'location': location,
                        'timestamp': firebase.firestore.FieldValue.serverTimestamp()
                    })
                        .catch(function (e) {
                        console.error("SensorProvider", JSON.stringify(e));
                    });
                }).catch(function (e) {
                    console.error("SensorProvider", JSON.stringify(e));
                });
            }, 5000);
        }).catch(function (e) {
            console.error("SensorProvider", JSON.stringify(e));
        });
    };
    SensorProvider.prototype.stop = function () {
        console.log('SensorProvider: Shutting Down...');
        clearInterval(this.timer);
    };
    SensorProvider = __decorate([
        Injectable(),
        __metadata("design:paramtypes", [HttpClient,
            AngularFirestore,
            LocationProvider,
            AuthProvider,
            Platform,
            NativeStorage])
    ], SensorProvider);
    return SensorProvider;
}());
export { SensorProvider };
//# sourceMappingURL=sensor.js.map