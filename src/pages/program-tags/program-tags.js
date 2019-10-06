var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { BleProvider } from '../../providers/ble/ble';
import { UtilsProvider } from '../../providers/utils/utils';
import { Subscription } from 'rxjs';
import { distinct, first } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import firebase from 'firebase';
var ProgramTagsPage = /** @class */ (function () {
    function ProgramTagsPage(navCtrl, navParams, BLE, utilsProvider, afs) {
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.BLE = BLE;
        this.utilsProvider = utilsProvider;
        this.afs = afs;
        this.scanning = false;
        this.sub = new Subscription();
    }
    ProgramTagsPage.prototype.toggleScan = function () {
        var _this = this;
        this.scanning = !this.scanning;
        var ids = [];
        if (this.scanning) {
            this.BLE.startScan();
            this.BLE.getProgrammableTags().pipe(distinct(), first()).subscribe(function (tag) {
                // if (ids.findIndex(value => {
                //   return value.id === tag.id;
                // }) == -1) {
                //   ids.push(tag);
                // } else {
                console.log("Tag", tag.id, "was seen more than once. Proceeding");
                _this.BLE.stopScan();
                _this.scanning = !_this.scanning;
                _this.utilsProvider.findRandomTagId().then(function (minor) {
                    console.log("Programming new tag with ID", minor);
                    _this.BLE.programTag(tag.id, 1, minor).then(function (res) {
                        console.log("Programmed tag with new ID");
                        _this.afs
                            .collection('Tags')
                            .doc(minor.toString())
                            .set({
                            'placeholder': true,
                            'lost': false,
                            'created': firebase.firestore.FieldValue.serverTimestamp()
                        })
                            .then(function () {
                            console.log("Created placeholder");
                        })
                            .catch(function (e) {
                            console.error(JSON.stringify(e));
                        });
                    }).catch(function (e) {
                        console.error(e);
                    });
                }).catch(function (e) {
                    console.error(e);
                });
                // }
                console.log(JSON.stringify(ids));
            });
        }
        else {
            this.BLE.stopScan();
        }
    };
    ProgramTagsPage.prototype.ionViewDidLoad = function () {
        console.log('ionViewDidLoad ProgramTagsPage');
    };
    ProgramTagsPage.prototype.ionViewWillLeave = function () {
        this.BLE.stopScan();
    };
    ProgramTagsPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-program-tags',
            templateUrl: 'program-tags.html',
        }),
        __metadata("design:paramtypes", [NavController, NavParams,
            BleProvider,
            UtilsProvider,
            AngularFirestore])
    ], ProgramTagsPage);
    return ProgramTagsPage;
}());
export { ProgramTagsPage };
//# sourceMappingURL=program-tags.js.map