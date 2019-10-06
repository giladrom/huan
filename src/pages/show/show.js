var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mergeMap } from 'rxjs/operators';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController, ActionSheetController, ViewController } from 'ionic-angular';
import { AngularFirestore } from '@angular/fire/firestore';
import { UtilsProvider } from '../../providers/utils/utils';
// Google Maps API
import { LatLng } from '@ionic-native/google-maps';
import { MarkerProvider } from '../../providers/marker/marker';
import { SMS } from '@ionic-native/sms';
import firebase from 'firebase';
import { LocationProvider } from '../../providers/location/location';
var ShowPage = /** @class */ (function () {
    function ShowPage(viewCtrl, navCtrl, navParams, alertCtrl, afs, utils, actionSheetCtrl, markerProvider, sms, locationProvider) {
        this.viewCtrl = viewCtrl;
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.alertCtrl = alertCtrl;
        this.afs = afs;
        this.utils = utils;
        this.actionSheetCtrl = actionSheetCtrl;
        this.markerProvider = markerProvider;
        this.sms = sms;
        this.locationProvider = locationProvider;
        this.name = '';
        this.lostSince = '';
        this.shareContactInfo = false;
        this.isLost = false;
        this.owners = new Array();
    }
    ShowPage.prototype.ngOnDestroy = function () {
        this.subscription.unsubscribe();
    };
    ShowPage.prototype.ionViewWillLoad = function () {
        var _this = this;
        this.tagId = this.navParams.data.tagId;
        this.anonymous = this.navParams.data.anonymous;
        this.tagItem$ = this.afs
            .collection('Tags', function (ref) {
            return ref.where('tagId', '==', _this.tagId).limit(1);
        })
            .valueChanges()
            .pipe(mergeMap(function (result) { return result; }));
        this.subscription = this.tagItem$.subscribe(function (data) {
            _this.subscription.unsubscribe();
            if (data.lost) {
                _this.markAsText = 'Mark as Found';
                _this.isLost = false;
            }
            else {
                _this.markAsText = 'Mark as Lost';
                _this.isLost = true;
            }
            var loc = data.location.split(',');
            _this.location = new LatLng(Number(loc[0]), Number(loc[1]));
            _this.locationProvider.getLocationName(_this.location).then(function (loc) {
                _this.locationProvider.getTownName(_this.location).then(function (town) {
                    _this.locationName = loc + ", " + town;
                });
            });
            _this.name = data.name;
            var ml = data.markedlost;
            _this.lostSince = _this.utils.getLastSeen(ml.toDate());
            // if (this.anonymous) {
            if (data.uid instanceof Array) {
                data.uid.forEach(function (owner) {
                    console.log('Retrieving owner info for item ' + owner);
                    var unsubscribe = _this.afs
                        .collection('Users')
                        .doc(owner.toString())
                        .ref.onSnapshot(function (doc) {
                        unsubscribe();
                        if (doc.exists) {
                            console.warn('Doc exists');
                            // this.shareContactInfo = doc.data().settings.shareContactInfo;
                            if (doc.data().settings.shareContactInfo === true) {
                                _this.owners.push({
                                    displayName: doc.data().account.displayName,
                                    phoneNumber: doc.data().account.phoneNumber,
                                    shareContactInfo: doc.data().settings.shareContactInfo
                                });
                                // this.displayName = doc.data().account.displayName;
                                // this.phoneNumber = doc.data().account.phoneNumber;
                            }
                        }
                    });
                });
            }
            else {
                console.log('Retrieving owner info for ' + data.uid);
                var unsubscribe = _this.afs
                    .collection('Users')
                    .doc(data.uid)
                    .ref.onSnapshot(function (doc) {
                    unsubscribe();
                    if (doc.exists) {
                        _this.shareContactInfo = doc.data().settings.shareContactInfo;
                        if (doc.data().settings.shareContactInfo === true) {
                            _this.owners.push({
                                displayName: doc.data().account.displayName,
                                phoneNumber: doc.data().account.phoneNumber,
                                shareContactInfo: doc.data().settings.shareContactInfo
                            });
                            // this.displayName = doc.data().account.displayName;
                            // this.phoneNumber = doc.data().account.phoneNumber;
                        }
                    }
                });
            }
            // }
        });
    };
    ShowPage.prototype.contactOwners = function (name, number) {
        var _this = this;
        var actionSheet = this.actionSheetCtrl.create({
            enableBackdropDismiss: true,
            title: 'Contact Owners (' + name + ')',
            buttons: [
                // {
                //   text: 'Call',
                //   // icon: 'call',
                //   handler: () => {
                //     this.callNumber.callNumber(number, true);
                //   }
                // },
                {
                    text: 'Send a Message',
                    // icon: 'text',
                    handler: function () {
                        _this.sms
                            .send(number, 'Hi! I just found ' + _this.name + '!')
                            .catch(function (error) {
                            console.error('Unable to send Message to ' + number);
                        });
                    }
                }
            ]
        });
        actionSheet.present();
    };
    ShowPage.prototype.getMarkedLostSubtitle = function (markedlost) {
        return this.utils.getLastSeen(markedlost.toDate());
    };
    ShowPage.prototype.edit = function () {
        this.navCtrl.push('EditPage', this.tagId);
    };
    ShowPage.prototype.markAsFunc = function () {
        if (!this.isLost) {
            this.markAsFound();
        }
        else {
            this.markAsLost();
        }
    };
    ShowPage.prototype.markAsLost = function () {
        var _this = this;
        console.log('Mark As Lost clicked');
        this.afs
            .collection('Tags')
            .doc(this.tagId)
            .ref.get()
            .then(function (data) {
            var confirm = _this.alertCtrl.create({
                title: 'Mark ' + data.get('name') + ' as lost',
                message: 'Are you sure?',
                buttons: [
                    {
                        text: 'Cancel',
                        handler: function () {
                            console.log('Cancel clicked');
                        }
                    },
                    {
                        text: 'Mark Lost!',
                        handler: function () {
                            _this.afs
                                .collection('Tags')
                                .doc(data.get('tagId'))
                                .update({
                                lost: true,
                                markedlost: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            _this.markerProvider.deleteMarker(_this.tagId);
                            _this.viewCtrl.dismiss().then(function () {
                                console.log('Popover dismissed');
                            });
                        }
                    }
                ],
                cssClass: 'alertclass'
            });
            confirm.present();
        });
    };
    ShowPage.prototype.markAsFound = function () {
        var _this = this;
        this.afs
            .collection('Tags')
            .doc(this.tagId)
            .ref.get()
            .then(function (data) {
            var confirm = _this.alertCtrl.create({
                title: 'Mark ' + data.get('name') + ' as found',
                message: 'Are you sure?',
                buttons: [
                    {
                        text: 'Cancel',
                        handler: function () {
                            console.log('Cancel clicked');
                        }
                    },
                    {
                        text: 'Mark Found!',
                        handler: function () {
                            _this.afs
                                .collection('Tags')
                                .doc(data.get('tagId'))
                                .update({
                                lost: false,
                                markedfound: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            _this.markerProvider.deleteMarker(_this.tagId);
                            _this.viewCtrl.dismiss().then(function () {
                                console.log('Popover dismissed');
                            });
                        }
                    }
                ],
                cssClass: 'alertclass'
            });
            confirm.present();
        });
    };
    ShowPage.prototype.lastSeen = function (lastseen) {
        return this.utils.getLastSeen(lastseen);
    };
    ShowPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-show',
            templateUrl: 'show.html'
        }),
        __metadata("design:paramtypes", [ViewController,
            NavController,
            NavParams,
            AlertController,
            AngularFirestore,
            UtilsProvider,
            ActionSheetController,
            MarkerProvider,
            SMS,
            LocationProvider])
    ], ShowPage);
    return ShowPage;
}());
export { ShowPage };
//# sourceMappingURL=show.js.map