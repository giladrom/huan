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
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { AngularFirestore } from '@angular/fire/firestore';
import { throwError as observableThrowError, ReplaySubject } from 'rxjs';
import { catchError, takeUntil, retry, map } from 'rxjs/operators';
var LeaderboardPage = /** @class */ (function () {
    function LeaderboardPage(navCtrl, navParams, afs) {
        this.navCtrl = navCtrl;
        this.navParams = navParams;
        this.afs = afs;
        this.destroyed$ = new ReplaySubject(1);
    }
    LeaderboardPage.prototype.ionViewDidLoad = function () {
        console.log('ionViewDidLoad LeaderboardPage');
        this.rescues$ = this.afs
            .collection('Rescues', function (ref) { return ref.orderBy('score', 'desc'); })
            .snapshotChanges()
            .pipe(catchError(function (e) { return observableThrowError(e); }), retry(2), takeUntil(this.destroyed$), map(function (actions) {
            return actions.map(function (a) {
                var data = a.payload.doc.data({
                    serverTimestamps: 'previous'
                });
                var id = a.payload.doc.id;
                return __assign({ id: id }, data);
            });
        }));
    };
    LeaderboardPage.prototype.openUrl = function (url) {
        window.open(url, '_system');
    };
    LeaderboardPage.prototype.ngOnDestroy = function () {
        this.destroyed$.next(true);
        this.destroyed$.complete();
    };
    LeaderboardPage = __decorate([
        IonicPage(),
        Component({
            selector: 'page-leaderboard',
            templateUrl: 'leaderboard.html',
        }),
        __metadata("design:paramtypes", [NavController,
            NavParams,
            AngularFirestore])
    ], LeaderboardPage);
    return LeaderboardPage;
}());
export { LeaderboardPage };
//# sourceMappingURL=leaderboard.js.map