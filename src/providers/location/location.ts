import { Injectable } from "@angular/core";

import { Coordinates, Geolocation, Geoposition } from "@ionic-native/geolocation/ngx";
import {
  NativeGeocoder,
  NativeGeocoderReverseResult
} from "@ionic-native/native-geocoder";
import { HttpClient } from "@angular/common/http";

import * as lodash from "lodash";
import { Platform } from "ionic-angular";

import { filter } from "rxjs/operators";

@Injectable()
export class LocationProvider {
  private position: Geoposition = {
    coords: {
      latitude: 34.181675,
      longitude: -118.769087,
      accuracy: 0,
      altitudeAccuracy: 0,
      altitude: 0,
      heading: 0,
      speed: 0,

    },
    timestamp: null
  };
  private location_subscription: any;

  constructor(
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
    private http: HttpClient,
    private platform: Platform
  ) {
    // this.position = null;
  }

  init() {
    // Watch the device's location continuously instead of polling every time
    this.platform.ready().then(() => {
      console.log("LocationProvider: Initializing...");

      this.watchLocation();
    });
  }

  watchLocation() {
    this.location_subscription = this.geolocation
      .watchPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      })
      .pipe(
        filter(p => p.coords !== undefined) //Filter Out Error
      )
      .subscribe(
        position => {
          this.position = position;
        },
        error => {
          console.error("LocationProvider: Unable to watch location", error);
        }
      );
  }

  getTownName(location) {
    return new Promise((resolve, reject) => {
      var locStr = location.toString().split(",");

      this.nativeGeocoder
        .reverseGeocode(Number(locStr[0]), Number(locStr[1]))
        .then((result: NativeGeocoderReverseResult[]) => {
          var town = result[0].locality + ", " + result[0].administrativeArea;

          resolve(town);
        })
        .catch((error: any) => {
          console.error("reverseGeocode: " + error);
          resolve(null);
        });
    });
  }

  getLocationName(location = null) {
    return new Promise((resolve, reject) => {
      if (location === null) {
        console.log(JSON.stringify(this.position));

        // this.geolocation
        //   .getCurrentPosition()
        //   .then(resp => {
        //     console.log(
        //       "getLocationName(): latitude: " +
        //         resp.coords.latitude +
        //         " longitude: " +
        //         resp.coords.longitude
        //     );

        try {
          this.nativeGeocoder
            .reverseGeocode(
              this.position.coords.latitude,
              this.position.coords.longitude
            )
            .then((result: NativeGeocoderReverseResult[]) => {
              resolve(result);
            })
            .catch((error: any) => {
              console.log(
                "LocationProvider: reverseGeocode()",
                JSON.stringify(error)
              );
              reject(JSON.stringify(error));
            });
        } catch (e) {
          console.error("nativeGeocoder", JSON.stringify(e));
        }
        // })
        // .catch(error => {
        //   console.log(
        //     "getLocationName(): Error getting location",
        //     JSON.stringify(error)
        //   );
        // });
      } else {
        var locStr = location.toString().split(",");

        this.nativeGeocoder
          .reverseGeocode(Number(locStr[0]), Number(locStr[1]))
          .then((result: NativeGeocoderReverseResult[]) => {
            // console.info(JSON.stringify(result));

            var loc;
            if (result[0].thoroughfare !== "") {
              loc = result[0].thoroughfare;
            } else if (result[0].subLocality !== "") {
              loc = result[0].subLocality;
            } else {
              loc = result[0].locality;
            }

            resolve(loc);
          })
          .catch((error: any) => {
            console.error("getLocationName(): reverseGeocode: " + error);
            resolve(null);
          });
      }
    });
  }

  getCommunityId(name: boolean = false, location: any = ""): Promise<any> {
    const apiKey = "AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk";

    return new Promise((resolve, reject) => {
      console.warn("### Using Google Geocoder Service");

      this.http
        .get("https://maps.googleapis.com/maps/api/geocode/json", {
          params: {
            latlng: `${location.latitude},${location.longitude}`,
            key: apiKey,
            language: "en"
          }
        })
        .subscribe(
          data => {
            var results = data["results"];
            let town, state, country;

            if (results[1]) {
              // Compose a unified topic name out of the Google Reverse-Geocode result
              results[1].address_components.forEach(element => {
                element.types.forEach(types => {
                  console.warn("Geocoder results: " + JSON.stringify(types));

                  const location = types.split(",")[0];
                  switch (location) {
                    case "locality":
                      console.error("locality: " + JSON.stringify(element));
                      town = element.short_name;
                      break;
                    case "administrative_area_level_2":
                      console.error("admin2: " + JSON.stringify(element));

                      // state = element.short_name;
                      break;
                    case "administrative_area_level_3":
                      console.error("admin3: " + JSON.stringify(element));

                      // state = element.short_name;
                      break;
                    case "route":
                      console.error("route: " + JSON.stringify(element));

                      // state = element.short_name;
                      break;

                    case "political":
                      console.error("political: " + JSON.stringify(element));

                      // state = element.short_name;
                      break;
                    case "administrative_area_level_1":
                      console.error("admin1: " + JSON.stringify(element));

                      state = element.short_name;
                      break;
                    case "country":
                      console.error("country: " + JSON.stringify(element));

                      country = element.short_name;
                      break;
                  }
                });
              });
            }
            let community = `${town} ${state} ${country}`;

            // Remove spaces and turn into underscores
            community = community.split(" ").join("_");

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
            console.error("Error: " + JSON.stringify(error));
          }
        );
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

  getLocation(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const locStr =
          this.position.coords.latitude + "," + this.position.coords.longitude;

        resolve(locStr);
      } catch (e) {
        console.error("getLocation", JSON.stringify(e));
        reject(e);
      }
    });
  }

  getCountry() {
    return new Promise((resolve, reject) => {
      this.nativeGeocoder
        .reverseGeocode(
          this.position.coords.latitude,
          this.position.coords.longitude
        )
        .then((result: NativeGeocoderReverseResult[]) => {
          resolve(result[0].countryCode);
        })
        .catch((error: any) => {
          console.error("getCountry(): reverseGeocode: " + error);
          reject(error);
        });
    });
  }

  getLocationObject(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      // if (this.position !== undefined && this.position.coords !== null) {
      resolve(this.position.coords);
      //   } else {
      //     resolve({
      //       latitude: 34.181675,
      //       longitude: -118.769087,
      //       accuracy: 0,
      //       altitudeAccuracy: 0,
      //       altitude: 0,
      //       heading: 0,
      //       speed: 0
      //     });

      //     // reject(false);
      //   }
      // });
    });
  }
}
