import { Injectable } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation';
import {
  NativeGeocoder,
  NativeGeocoderReverseResult
} from '@ionic-native/native-geocoder';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as lodash from 'lodash';

@Injectable()
export class LocationProvider {
  constructor(
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
    private http: HttpClient
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

  getCommunityId(): Promise<any> {
    const apiKey = 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk';

    return new Promise((resolve, reject) => {
      this.geolocation
        .getCurrentPosition()
        .then(resp => {
          this.http
            .get('https://maps.googleapis.com/maps/api/geocode/json', {
              params: {
                latlng: `${resp.coords.latitude},${resp.coords.longitude}`,
                key: apiKey
              }
            })
            .subscribe(
              data => {
                var results = data['results'];
                let town, state, country;

                // Compose a unified topic name out of the Google Reverse-Geocode result
                results[0].address_components.forEach(element => {
                  element.types.forEach(types => {
                    switch (types.split(',')[0]) {
                      case 'locality':
                        town = element.short_name;
                        break;
                      case 'administrative_area_level_1':
                        state = element.short_name;
                        break;
                      case 'country':
                        country = element.short_name;
                        break;
                    }
                  });
                });

                let community = `${town} ${state} ${country}`;

                // Remove spaces and turn into underscores
                community = community.split(' ').join('_');

                // Remove  accents and turn into English alphabet
                community = lodash.deburr(community);
                resolve(community);
              },
              error => {
                reject(error);
                console.error('Error: ' + JSON.stringify(error));
              }
            );
        })
        .catch(e => {
          console.error('getCommunityId: Unable to get current location: ' + e);
          reject(e);
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
