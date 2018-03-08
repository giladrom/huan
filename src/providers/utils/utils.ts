import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';

/*
  Generated class for the UtilsProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class UtilsProvider {

  constructor(public http: HttpClient) {
    console.log('Hello UtilsProvider Provider');
  }

  getLastSeen(lastseen) {
    var ls = moment.unix(lastseen / 1000);
    var now = moment(Date.now());
    
    var timeDiffString = "Last seen ";

    var days = now.diff(ls, 'days');
    now.subtract(days, 'days');
    var hours = now.diff(ls, 'hours');
    now.subtract(hours, 'hours');
    var minutes = now.diff(ls, 'minutes');
    var seconds = now.diff(ls, 'seconds');

    if (minutes < 1) { 
      timeDiffString += "less than a minute ago";
      return timeDiffString;
    }

    if (days > 0 ) {
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

}
