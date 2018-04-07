import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation';
import { NativeGeocoder, NativeGeocoderReverseResult, NativeGeocoderForwardResult } from '@ionic-native/native-geocoder';

@Injectable()
export class LocationProvider {

  constructor(
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder
  ) {
    console.log('Hello LocationProvider Provider');
  }

  getLocationName() {
    return new Promise((resolve, reject) => {
      this.geolocation.getCurrentPosition().then((resp) => {
        console.log("latitude: " + resp.coords.latitude + " longitude: " + resp.coords.longitude);

        this.nativeGeocoder.reverseGeocode(resp.coords.latitude, resp.coords.longitude)
          .then((result: NativeGeocoderReverseResult) => {
            console.log(JSON.stringify(result));
            //alert(JSON.stringify(result));
            resolve(result);
          }
          ).catch((error: any) => {
            console.log(error)
            reject(JSON.stringify(error));
          }
          );
      }).catch((error) => {
        console.log('Error getting location', error);
      });
    });
  }
  
  getLocation() {
    return new Promise((resolve, reject) => {
      this.geolocation.getCurrentPosition({ enableHighAccuracy: true }).then((resp) => {
        console.log("latitude: " + resp.coords.latitude + " longitude: " + resp.coords.longitude);

        var locStr = resp.coords.latitude + ',' + resp.coords.longitude;
        resolve(locStr);
      }).catch((error) => {
        console.log('Error getting location', JSON.stringify(error));
        reject(JSON.stringify(error));
      });
    });
  }
  
}
