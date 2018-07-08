import { Injectable } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation';
import {
  NativeGeocoder,
  NativeGeocoderReverseResult
} from '@ionic-native/native-geocoder';

@Injectable()
export class LocationProvider {
  constructor(
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder
  ) {
    console.log('Hello LocationProvider Provider');
  }

  getTownName(location) {
    return new Promise((resolve, reject) => {
      var locStr = location.toString().split(',');

      this.nativeGeocoder
        .reverseGeocode(Number(locStr[0]), Number(locStr[1]))
        .then((result: NativeGeocoderReverseResult) => {
          var town = result[0].locality + ', ' + result[0].administrativeArea;

          resolve(town);
        })
        .catch((error: any) => {
          console.error('reverseGeocode: ' + error);
          resolve(null);
        });
    });
  }

  getLocationName() {
    return new Promise((resolve, reject) => {
      this.geolocation
        .getCurrentPosition()
        .then(resp => {
          console.log(
            'latitude: ' +
              resp.coords.latitude +
              ' longitude: ' +
              resp.coords.longitude
          );

          this.nativeGeocoder
            .reverseGeocode(resp.coords.latitude, resp.coords.longitude)
            .then((result: NativeGeocoderReverseResult) => {
              resolve(result);
            })
            .catch((error: any) => {
              console.log(error);
              reject(JSON.stringify(error));
            });
        })
        .catch(error => {
          console.log('Error getting location', error);
        });
    });
  }

  getLocationId(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.geolocation
        .getCurrentPosition()
        .then(resp => {
          this.nativeGeocoder
            .reverseGeocode(resp.coords.latitude, resp.coords.longitude)
            .then((result: NativeGeocoderReverseResult) => {
              console.log(JSON.stringify(result[0]));
              resolve(result[0].thoroughfare);
            })
            .catch((error: any) => {
              console.log(error);
              reject(JSON.stringify(error));
            });
        })
        .catch(error => {
          console.log('Error getting location', error);
        });
    });
  }

  getLocation() {
    return new Promise((resolve, reject) => {
      this.geolocation
        .getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        })
        .then(resp => {
          var locStr = resp.coords.latitude + ',' + resp.coords.longitude;
          resolve(locStr);
        })
        .catch(error => {
          console.error('Error getting location', JSON.stringify(error));
          reject(error);
        });
    });
  }
}
