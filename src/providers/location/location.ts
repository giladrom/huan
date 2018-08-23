import { Injectable } from '@angular/core';

import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import {
  NativeGeocoder,
  NativeGeocoderReverseResult
} from '@ionic-native/native-geocoder';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as lodash from 'lodash';
import { Platform } from 'ionic-angular';

import { filter } from 'rxjs/operators';

@Injectable()
export class LocationProvider {
  private position: Geoposition;

  constructor(
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
    private http: HttpClient,
    private platform: Platform
  ) {
    console.log('LocationProvider: Initializing...');

    // Watch the device's location continuously instead of polling every time
    this.platform.ready().then(() => {
      const subscription = this.geolocation
        .watchPosition({
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000
        })
        .pipe(
          filter(p => p.coords !== undefined) //Filter Out Error
        )
        .subscribe(position => {
          this.position = position;
        });
    });
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

  getLocationName(location = null) {
    return new Promise((resolve, reject) => {
      if (location === null) {
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
            console.log('getLocationName(): Error getting location', error);
          });
      } else {
        var locStr = location.toString().split(',');

        this.nativeGeocoder
          .reverseGeocode(Number(locStr[0]), Number(locStr[1]))
          .then((result: NativeGeocoderReverseResult) => {
            console.info(JSON.stringify(result));

            var loc;
            if (result[0].thoroughfare !== '') {
              loc = result[0].thoroughfare;
            } else if (result[0].subLocality !== '') {
              loc = result[0].subLocality;
            } else {
              loc = result[0].locality;
            }

            resolve(loc);
          })
          .catch((error: any) => {
            console.error('getLocationName(): reverseGeocode: ' + error);
            resolve(null);
          });
      }
    });
  }

  getCommunityId(name: boolean = false): Promise<any> {
    const apiKey = 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk';

    return new Promise((resolve, reject) => {
      this.geolocation
        .getCurrentPosition()
        .then(resp => {
          console.warn('### Using Google Geocoder Service');

          this.http
            .get('https://maps.googleapis.com/maps/api/geocode/json', {
              params: {
                latlng: `${resp.coords.latitude},${resp.coords.longitude}`,
                key: apiKey,
                language: 'en'
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

                if (name === true) {
                  resolve(town);
                } else {
                  // Remove  accents and turn into English alphabet
                  community = lodash.deburr(community);
                  resolve(community);
                }
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

  // getLocation() {
  //   return new Promise((resolve, reject) => {
  //     this.geolocation
  //       .getCurrentPosition({
  //         enableHighAccuracy: true,
  //         timeout: 30000,
  //         maximumAge: 60000
  //       })
  //       .then(resp => {
  //         var locStr = resp.coords.latitude + ',' + resp.coords.longitude;
  //         resolve(locStr);
  //       })
  //       .catch(error => {
  //         console.error('Error getting location', JSON.stringify(error));
  //         reject(error);
  //       });
  //   });
  // }

  getLocation() {
    return new Promise((resolve, reject) => {
      var locStr =
        this.position.coords.latitude + ',' + this.position.coords.longitude;
      resolve(locStr);
    });
  }
}
