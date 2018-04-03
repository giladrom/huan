import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';
import { AngularFireAuth } from 'angularfire2/auth';

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subject } from 'rxjs/Subject';
import { Subscription } from "rxjs/Subscription";
import 'rxjs/add/operator/takeUntil';

@Injectable()
export class UtilsProvider implements OnDestroy {
  private subscription: any;
  alive: boolean = true;

  componentDestroyed$: Subject<boolean> = new Subject();

  constructor(public http: HttpClient,
    private afAuth: AngularFireAuth) {
    console.log('Hello UtilsProvider Provider');
  }

  getLastSeen(lastseen) {
    var ls = moment.unix(lastseen / 1000);
    var now = moment(Date.now());

    var timeDiffString = "";

    var days = now.diff(ls, 'days');
    now.subtract(days, 'days');
    var hours = now.diff(ls, 'hours');
    now.subtract(hours, 'hours');
    var minutes = now.diff(ls, 'minutes');
    var seconds = now.diff(ls, 'seconds');

    if (minutes < 1) {
      timeDiffString += "Less than a minute ago";
      return timeDiffString;
    }

    if (days > 0) {
      timeDiffString += days + " Days, ";
    }

    if (hours == 1) {
      timeDiffString += hours + " Hour, ";
    } else if (hours > 1) {
      timeDiffString += hours + " Hours, ";
    }

    timeDiffString += minutes + " Minutes ago";

    return timeDiffString;
  }

  pad(n, width, z): string {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  getUserId(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.subscription = this.afAuth.authState
        .subscribe((user) => {

          if (user) {
            resolve(this.afAuth.auth.currentUser.uid);
          } else {
            reject('-1');
          }
        },
          (err) => {
            reject("Unable to get auth state: " + err);
          })
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
