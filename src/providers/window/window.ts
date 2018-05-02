import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

function _window(): any {
  // return the global native browser window object
  return window;
}

@Injectable()
export class WindowProvider {
  constructor(public http: HttpClient) {
    console.log('Hello WindowProvider Provider');
  }

  get nativeWindow(): any {
    return _window();
  }
}
