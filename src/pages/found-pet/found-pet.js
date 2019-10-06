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
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, Platform } from 'ionic-angular';
import { QrProvider } from '../../providers/qr/qr';
import { MarkerProvider } from '../../providers/marker/marker';
import { SplashScreen } from '@ionic-native/splash-screen';
import { AuthProvider } from '../../providers/auth/auth';
import { BleProvider } from '../../providers/ble/ble';
import { Observable, Subject } from 'rxjs';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from '@angular/fire/firestore';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';
var FoundPetPage = /** @class */ (function () {
    function FoundPetPage(navCtrl, navParams, qrProvider, markerProvider, alertController, splashScreen, authProvider, bleProvider, platform, utilsProvider, afs) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.qrProvider = qrProvider;
        this.markerProvider = markerProvider;
        this.alertController = alertController;
        this.splashScreen = splashScreen;
        this.authProvider = authProvider;
        this.bleProvider = bleProvider;
        this.platform = platform;
        this.utilsProvider = utilsProvider;
        this.afs = afs;
        this.destroyed$ = new Subject();
        this.tagList = [];
        this.tags$ = new Observable();
        this.tagSubject = new BehaviorSubject([]);
        this.showScanning = true;
        this.showList = false;
        this.showScanQR = false;
        var beacons$;
        var beaconSubscription;
        var foundBeacons = false;
        this.destroyed$ = new Subject();
        var interval = setTimeout(function () {
            _this.bleProvider.stopScan();
            _this.showScanning = false;
            if (foundBeacons) {
                _this.showList = true;
            }
            else {
                _this.showScanQR = true;
            }
            _this.destroyed$.next(true);
            _this.destroyed$.complete();
            if (beaconSubscription) {
                beaconSubscription.unsubscribe();
            }
        }, 15000);
        this.tagSubject.subscribe(function (tag) {
            tag.forEach(function (t) {
                console.log('Received: ' + JSON.stringify(t));
            });
        });
        this.platform.ready().then(function () {
            _this.bleProvider.startScan();
            beacons$ = _this.bleProvider.getTags();
            beaconSubscription = beacons$
                .pipe(takeUntil(_this.destroyed$))
                .subscribe(function (beacon) {
                beacon.forEach(function (b) {
                    var paddedId = _this.utilsProvider.pad(b.info.minor, 4, '0');
                    var exists = false;
                    var unsubscribe = _this.afs
                        .collection('Tags')
                        .doc(paddedId)
                        .ref.onSnapshot(function (data) {
                        if (data.data()) {
                            _this.tagList.forEach(function (t) {
                                if (t.tagId === data.data().tagId) {
                                    exists = true;
                                }
                            });
                            if (!exists) {
                                console.log('Pushing: ' + JSON.stringify(data.data()));
                                _this.tagList.push(data.data());
                                _this.tagSubject.next(_this.tagList);
                            }
                            foundBeacons = true;
                        }
                        unsubscribe();
                    });
                });
            });
        });
    }
    Object.defineProperty(FoundPetPage.prototype, "tagListObservable", {
        get: function () {
            return this.tagSubject.asObservable();
        },
        enumerable: true,
        configurable: true
    });
    FoundPetPage.prototype.ngOnDestroy = function () {
        console.log('Destroying FountPetPage');
    };
    FoundPetPage.prototype.scanQR = function () {
        var _this = this;
        this.qrProvider
            .scan()
            .then(function () {
            _this.tagId = _this.qrProvider.getScannedTagId().minor;
            var unsubscribe = _this.afs
                .collection('Tags')
                .doc(_this.tagId)
                .ref.onSnapshot(function (doc) {
                if (doc.exists) {
                    console.log('Showing Info for tag ' + _this.tagId);
                    _this.markerProvider.showInfoPopover(_this.tagId, true);
                }
                else {
                    _this.utilsProvider.displayAlert('Unable to display info', 'Scanned tag is not registered.');
                }
                unsubscribe();
            });
        })
            .catch(function (error) {
            _this.incompatibleTag(error);
        });
    };
    FoundPetPage.prototype.incompatibleTag = function (error) {
        var confirm = this.alertController.create({
            title: 'Error scanning Tag',
            message: error,
            buttons: [
                {
                    text: 'Ok',
                    handler: function () { }
                }
            ],
            cssClass: 'alertclass'
        });
        confirm.present();
    };
    FoundPetPage.prototype.showInfoPopover = function (tagId) {
        this.markerProvider.showInfoPopover(tagId, true);
    };
    FoundPetPage.prototype.logout = function () {
        this.authProvider.logoutUser().catch(function (error) {
            console.error(error);
        });
    };
    FoundPetPage.prototype.lastSeen = function (lastseen) {
        return this.utilsProvider.getLastSeen(lastseen);
    };
    FoundPetPage.prototype.ionViewWillLoad = function () {
        this.tagList = [];
    };
    FoundPetPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        console.log('ionViewDidLoad FoundPetPage');
        this.progressBar = document.getElementById('progressbar');
        var progress = 1;
        var progressInterval = setInterval(function () {
            progress++;
            _this.progressBar.style.width = progress + '%';
            if (progress > 99) {
                clearInterval(progressInterval);
            }
        }, 150);
        this.splashScreen.hide();
    };
    FoundPetPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-found-pet',
            templateUrl: 'found-pet.html'
        }),
        __metadata("design:paramtypes", [NavController,
            NavParams,
            QrProvider,
            MarkerProvider,
            AlertController,
            SplashScreen,
            AuthProvider,
            BleProvider,
            Platform,
            UtilsProvider,
            AngularFirestore])
    ], FoundPetPage);
    return FoundPetPage;
}());
export { FoundPetPage };
//# sourceMappingURL=found-pet.js.map