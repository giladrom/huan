import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// Google Maps API
import { MarkerCluster, MarkerIcon, Marker } from '@ionic-native/google-maps';

@Injectable()
export class MarkerProvider {
  private markers = {};

  constructor(public http: HttpClient) {
    console.log('Hello MarkerProvider Provider');
  }

  exists(index) {
    return this.markers[index] !== undefined;
  }

  addMarker(index, marker) {
    this.markers[index] = marker;
  }

  getMarker(index) {
    if (this.exists(index)) {
      return this.markers[index];
    } else {
      return false;
    }
  }

  deleteMarker(index) {
    if (this.exists(index)) {
      this.markers[index].delete;
    }
  }
}
