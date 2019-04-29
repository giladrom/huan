import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';

// Google Maps API
import {

  GoogleMap,
  GoogleMapsEvent,
  LatLng,
  Marker,
  GoogleMaps,
  GoogleMapOptions,
  GoogleMapsAnimation,
  ILatLng,
  GoogleMapsMapTypeId
} from '@ionic-native/google-maps';
import {
  PopoverController,
  Platform,
  ActionSheetController,
  App,
  normalizeURL,
  AlertController
} from 'ionic-angular';
import { ReplaySubject } from '../../../node_modules/rxjs/ReplaySubject';
import { Mixpanel } from '@ionic-native/mixpanel';
import moment from 'moment';

@Injectable()
export class MarkerProvider implements OnDestroy {
  // Map variables
  private map: GoogleMap = null;
  mapReady: boolean = false;
  firstLoad: boolean = true;

  private markers = new Map();

  private marker_files = [
    'assets/imgs/map-marker-2-128-blue.png',
    'assets/imgs/map-marker-2-128-green.png',
    'assets/imgs/map-marker-2-128-navyblue.png',
    'assets/imgs/map-marker-2-128-orange.png',
    'assets/imgs/map-marker-2-128-pink.png',
    'assets/imgs/map-marker-2-128-red.png'
  ];

  private report_marker_files = {
    police: 'assets/imgs/marker-police.png',
    pet_friendly: 'assets/imgs/marker-pet_friendly.png',
    hazard: 'assets/imgs/marker-hazard.png',
    crowded: 'assets/imgs/marker-crowded.png'
  };

  private marker_index = 0;

  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private markerSubscriptions = [];

  private win: any = window;

  constructor(
    public http: HttpClient,
    public popoverCtrl: PopoverController,
    private actionSheetCtrl: ActionSheetController,
    private platform: Platform,
    public app: App,
    private mixpanel: Mixpanel,
    private alertCtrl: AlertController
  ) {
    console.log('MarkerProvider: Initializing...');
  }

  private night_map_style =
    [
      {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#cdd4d7"
          }
        ]
      },
      {
        "featureType": "administrative",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#504f53"
          }
        ]
      },
      {
        "featureType": "administrative.country",
        "elementType": "geometry",
        "stylers": [
          {
            "visibility": "simplified"
          }
        ]
      },
      {
        "featureType": "administrative.country",
        "elementType": "labels.text",
        "stylers": [
          {
            "color": "#0d1012"
          },
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#47494a"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#37393a"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#a7a7a7"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#4a4c51"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#2d4031"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#80a78e"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#417051"
          },
          {
            "weight": "1.39"
          },
          {
            "gamma": "0.68"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#707170"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#d0dde4"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#444a4d"
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#5a5c5e"
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "labels",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "road.local",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#313133"
          }
        ]
      },
      {
        "featureType": "road.local",
        "elementType": "labels",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#7c8690"
          },
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "transit",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#b6b7b9"
          },
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#37393a"
          },
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "labels.text.fill",
        "stylers": [
          {
            "color": "#b6b7b9"
          }
        ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "labels.text.stroke",
        "stylers": [
          {
            "color": "#4a4c51"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#18212e"
          }
        ]
      }
    ];

  private day_map_style =
    [
      {
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#f9f5ed"
          },
          {
            "saturation": "0"
          }
        ]
      },
      {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#d0e3b4"
          }
        ]
      },
      {
        "featureType": "landscape.natural.terrain",
        "elementType": "geometry",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "poi",
        "elementType": "labels",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "poi.attraction",
        "elementType": "all",
        "stylers": [
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "poi.business",
        "elementType": "all",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "poi.medical",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#fbd3da"
          }
        ]
      },
      {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#bde6ab"
          }
        ]
      },
      {
        "featureType": "poi.sports_complex",
        "elementType": "all",
        "stylers": [
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [
          {
            "visibility": "off"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#fcfcdd"
          },
          {
            "saturation": "0"
          }
        ]
      },
      {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#efd151"
          },
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#ffffff"
          }
        ]
      },
      {
        "featureType": "road.arterial",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "color": "#dcdcdc"
          },
          {
            "visibility": "on"
          }
        ]
      },
      {
        "featureType": "road.local",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "visibility": "on"
          },
          {
            "color": "#ffffff"
          }
        ]
      },
      {
        "featureType": "road.local",
        "elementType": "geometry.stroke",
        "stylers": [
          {
            "visibility": "on"
          },
          {
            "color": "#dedbd3"
          }
        ]
      },
      {
        "featureType": "transit.station.airport",
        "elementType": "geometry.fill",
        "stylers": [
          {
            "color": "#cfb2db"
          }
        ]
      },
      {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
          {
            "color": "#a2daf2"
          }
        ]
      }
    ];

  init(mapElement, location) {
    return new Promise((resolve, reject) => {
      if (!this.map) {
        let mapOptions: GoogleMapOptions = {
          camera: {
            target: {
              lat: location !== null ? location.latitude : 34.0505227,
              lng: location !== null ? location.longitude : -118.2089132
            },
            zoom: 10,
            tilt: 45,

          },
          controls: {
            compass: false,
            myLocationButton: false,
            myLocation: false,
            indoorPicker: false,
            zoom: false,
          },
          gestures: {
            scroll: true,
            tilt: false,
            rotate: false,
            zoom: true
          },
          styles: moment().hours() > 20 || moment().hours() < 5 ? this.night_map_style : this.day_map_style
        };

        console.log("Initializing GoogleMap instance");

        this.map = GoogleMaps.create(mapElement, mapOptions);

        console.log("GoogleMap created", JSON.stringify(this.map));

        this.map
          .one(GoogleMapsEvent.MAP_READY)
          .then(r => {
            console.log('MarkerProvider: init: ', JSON.stringify(r));

            this.mapReady = true;
            this.map.setMyLocationEnabled(true);
            this.map.setMapTypeId(GoogleMapsMapTypeId.NORMAL);
            this.map.setVisible(true);

            resolve(true);
          })
          .catch(error => {
            console.error('map.one Error: ' + JSON.stringify(error));

            reject(error);
          });
      }
    });
  }

  resetMap(mapElement, addmarker = false) {
    if (this.platform.is('ios') || addmarker === true) {
      if (this.mapReady) {
        console.info('markerProvider: Resetting Map');
        // try {
        //   this.map.setDiv();
        // } catch (e) {
        //   console.error('resetMap setDiv', e);
        // }

        // try {
        //   this.map.setDiv(mapElement);
        // } catch (e) {
        //   console.error('resetMap setDiv(mapElement)');
        // }

        try {
          this.map.setVisible(false);
          this.map.setVisible(true);
        } catch (e) {
          console.error('resetMap setVisible');
        }
      }
    }
  }

  getMap() {
    return this.map;
  }

  exists(index) {
    return this.markers.has(index);
  }

  isValid(index) {
    return this.exists(index) && this.markers.get(index) != 0;
  }

  showSingleMarker(data, tag = false) {
    var locStr, latlng;

    if (tag) {
      if (typeof this.getMarker(data).getPosition == 'function') {
        latlng = this.getMarker(data).getPosition();
      } else {
        console.log('showSingleMarker: marker expired');
        return;
      }
    } else {
      locStr = data.toString().split(',');
      latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));
    }

    if (this.mapReady) {
      this.map.animateCamera({
        target: latlng,
        zoom: 18,
        duration: 500
      });
    }
  }

  showAllMarkers() {
    var latLngArray: Array<ILatLng> = this.getLatLngArray();

    if (this.mapReady) {
      console.log('### Setting Camera Target', JSON.stringify(latLngArray));

      // this.map.setCameraTarget(latLngArray[0]);

      this.map.moveCamera({
        target: latLngArray
      });

      // setTimeout(() => {
      //   this.map.animateCameraZoomOut().then(() => {
      //     this.map.animateCameraZoomOut();
      //   });
      // }, 550);
    }
  }

  getLatLngArray(): Array<ILatLng> {
    var latlngArray = new Array<ILatLng>();

    this.markers.forEach((value, key) => {
      var marker: Marker = <Marker>value;

      if (
        typeof marker.getPosition === 'function' &&
        marker.get('type') === 'tag' &&
        marker.get('mine') === true
      ) {
        latlngArray.push(marker.getPosition());
      }
    });

    return latlngArray;
  }

  getMarkerSubscriptions() {
    return this.markerSubscriptions;
  }

  spaceOutMarkers(level) {
    var index = 0;
    // for (var key in this.markers) {
    this.markers.forEach((value, key) => {
      index++;

      if (this.isValid(key)) {
        var marker: Marker = <Marker>value;

        if (typeof marker.getPosition == 'function') {
          var latlng = marker.getPosition();
          var space = Number(level / 100000000);

          var direction = index % 2 ? -Math.abs(space) : Math.abs(space);
          console.log(`Moving marker ${key} by ${direction}`);

          marker.setPosition({
            lat: latlng.lat + direction,
            lng: latlng.lng + direction
          });
        }
      }
    });
  }

  addReportMarker(report) {
    return new Promise((resolve, reject) => {
      // console.log('Marker icon: ' + this.report_marker_files[report.report]);

      var locStr = report.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      // Check to see if there are other markers of this type in close proximity
      if (
        this.isMarkerAdjacent(latlng.lat, latlng.lng, report.report) === true
      ) {
        reject('addReportMarker: markers are adjacent');
      } else {
        this.map
          .addMarker({
            icon: {
              url: this.report_marker_files[report.report],
              size: {
                width: 50,
                height: 50
              }
            },
            flat: true,
            position: latlng,
            animation: GoogleMapsAnimation.DROP
          })
          .then(marker => {
            // console.log('Succcessfully added marker type: ' + report.report);

            marker.set('type', report.report);

            this.markers.set(report.id, marker);

            // console.log(
            //   'addReportMarker: this.markers.size: ' + this.markers.size
            // );

            marker.setZIndex(2);

            resolve(marker);
          })
          .catch(error => {
            reject(error);
          });
      }
    });
  }

  addHomeMarker(location: string) {
    return new Promise((resolve, reject) => {
      var locStr = location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      if (location.length < 1) {
        reject('Location string is empty');
      }

      this.map
        .addMarker({
          icon: {
            url: this.platform.is('ios') ? 'www/assets/imgs/marker-home.png' : 'assets/imgs/marker-home.png',
            size: {
              width: 50,
              height: 60
            }
          },
          flat: false,
          position: latlng
        })
        .then(marker => {
          marker.set('type', 'home');

          this.markers.set('home', marker);
          resolve(marker);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  addFixedSensorMarker(latlng) {
    return new Promise((resolve, reject) => {
      this.map
        .addMarker({
          icon: {
            url: this.platform.is('ios') ? 'www/assets/imgs/marker-sensor.png' : 'assets/imgs/marker-sensor.png',
            size: {
              width: 33,
              height: 40
            }
          },
          flat: false,
          position: latlng
        })
        .then(marker => {
          marker.set('type', 'sensor');
          resolve(marker);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  addPetMarker(tag, mine) {
    return new Promise((resolve, reject) => {
      this.addMarker(tag, mine)
        .then(marker => {
          this.markerSubscriptions[tag.tagId] = marker
            .on(GoogleMapsEvent.MARKER_CLICK)
            .subscribe(() => {
              this.mixpanel.track('marker_click', { tag: tag.tagId }).then(() => { }).catch(e => {
                console.error('Mixpanel Error', e);
              });

              this.markerActions(tag);
            });
          resolve(true);
        })
        .catch(error => {
          console.error('addMarker() error: ' + error);
          reject(error);
        });
    });
  }

  addMarker(tag, mine): Promise<any> {
    // Set an initial value to prevent duplicate markers from being created,
    // since the generateAvatar function takes a while to initialize

    return new Promise((resolve, reject) => {
      this.markers.set(tag.tagId, 0);

      if (!this.mapReady) {
        reject('Map not ready');
      }

      var locStr = tag.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      if (tag.location.length < 1) {
        reject('Location string is empty');
      }

      this.generateAvatar(tag).then(avatar => {
        this.map
          .addMarker({
            icon: {
              url: avatar,
              size: {
                width: 412 / 4,
                height: 512 / 4
              }
            },
            // flat: true,
            // title: tag.name,
            position: latlng,
            zIndex: 99999999
          })
          .then(marker => {
            // Set marker type in the Baseclass so we can tell the difference between them when we
            // iterate over them later
            marker.set('type', 'tag');
            marker.set('mine', mine);

            marker.setZIndex(999);
            this.markers.set(tag.tagId, marker);
            console.log('this.markers.size: ' + this.markers.size);

            resolve(marker);
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }

  getMarkerLocationOnMap(tagId) {
    return new Promise((resolve, reject) => {
      this.map
        .fromLatLngToPoint(this.getMarker(tagId).getPosition())
        .then(r => {
          resolve(r);
        })
        .catch(e => {
          console.error('getMarkerLocationOnMap', JSON.stringify(e));
          reject(e);
        });
    });
  }

  getMarker(index) {
    if (this.exists(index)) {
      return this.markers.get(index);
    } else {
      return false;
    }
  }


  deleteMarker(index) {
    return new Promise((resolve, reject) => {
      if (this.exists(index)) {
        if (typeof this.markers.get(index).remove === 'function') {
          try {
            this.markers.get(index).remove();
          } catch (e) {
            console.error('deleteMarker: remove', JSON.stringify(e));
          }
        }

        try {
          this.markers.delete(index);
        } catch (e) {
          console.error('deleteMarker: delete', JSON.stringify(e));
        }
        resolve(true);
      } else {
        reject('Marker does not exist: ' + index);
      }
    });
  }

  generateAvatar(tag): Promise<any> {
    return new Promise((resolve, reject) => {
      var petImg = new Image();
      var petCanvas;
      petImg.crossOrigin = 'anonymous';
      petImg.src = tag.img;

      petImg.onload = () => {
        let canvas = <HTMLCanvasElement>document.createElement('canvas');
        let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

        canvas.width = petImg.width;
        canvas.height = petImg.height;

        // Size of the round clipped image
        var size = 210;

        ctx.save();
        ctx.beginPath();
        ctx.arc(260, 215, size, 0, Math.PI * 2, true);
        ctx.fillStyle = '#a5a5a5';
        ctx.fill();
        ctx.closePath();
        ctx.clip();

        // Draw pet image inside circle
        ctx.drawImage(petImg, 55, 5, petImg.width * 0.85, petImg.height * 0.85);

        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        petCanvas = canvas;

        var markerImg = new Image();
        markerImg.crossOrigin = 'anonymous';

        if (!tag.lost) {
          markerImg.src = normalizeURL('assets/imgs/marker5.png');
        } else {
          markerImg.src = normalizeURL('assets/imgs/marker5-lost.png');
        }

        this.marker_index++;
        if (this.marker_index > this.marker_files.length) {
          this.marker_index = 0;
        }

        markerImg.onload = () => {
          let canvas = <HTMLCanvasElement>document.createElement('canvas');
          let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

          console.log('***********************************');
          console.log('Generating avatar for ' + tag.name);
          console.log('***********************************');

          // ctx.webkitImageSmo52othingEnabled = true;

          canvas.width = markerImg.width;
          canvas.height = markerImg.height;

          ctx.drawImage(markerImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';

          // Draw clipped image unto marker
          ctx.drawImage(petCanvas, -4, 44, petCanvas.width, petCanvas.height);

          // ctx.translate(0.5, 0.5);
          ctx.restore();

          resolve(canvas.toDataURL());
        };
      };
    });
  }

  showInfoPopover(tagId, anonymous = false) {
    // this.navCtrl.push('ShowPage', {
    //   tagId: tagId,
    //   anonymous: anonymous
    // });

    let popover = this.popoverCtrl.create(
      'ShowPage',
      {
        tagId: tagId,
        anonymous: anonymous
      },
      {
        enableBackdropDismiss: true,
        showBackdrop: true,
        cssClass: 'show-info-popover'
      }
    );

    popover.present();
  }

  // Find if there are other markers in close proximity to this one
  isMarkerAdjacent(lat, lon, type = 'report') {
    var adjacent = false;

    // console.log(
    //   'Checking if marker is adjacent: this.markers.size : ' + this.markers.size
    // );

    this.markers.forEach((value, key) => {
      var marker: Marker = <Marker>value;

      if (
        typeof marker.getPosition === 'function' /* && marker.get('type') === type*/
      ) {
        let distance = this.distanceInKmBetweenEarthCoordinates(
          lat,
          lon,
          marker.getPosition().lat,
          marker.getPosition().lng
        );
        console.log(
          `Distance between marker to ${key}: ${distance}`
        );

        // Return true is markers are too close
        if (distance < 0.02) {
          console.log('isMarkerAdjacent: Markers are adjacent');
          adjacent = true;
        }
      }
    });

    return adjacent;
  }

  // Calculate geographical distance between two GPS coordinates
  // Shamelessly stolen from https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
  degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
    var earthRadiusKm = 6371;

    var dLat = this.degreesToRadians(lat2 - lat1);
    var dLon = this.degreesToRadians(lon2 - lon1);

    lat1 = this.degreesToRadians(lat1);
    lat2 = this.degreesToRadians(lat2);

    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  destroy() {
    this.markers.forEach((value, key) => {
      console.log('Removing marker for ' + key);
      this.deleteMarker(key);
    });

    this.map.remove();
    this.map = null;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  markerActions(tag) {
    var buttons = [

      {
        text: 'Show Pet Profile',
        handler: () => {
          this.app.getActiveNav().push('ShowPage', {
            tagId: tag.tagId,
            anonymous: false
          });
        }
      },
      {
        text: 'Get Directions',
        handler: () => {
          if (this.platform.is('ios')) {
            window.open(
              'maps://?q=' + tag.name + '&daddr=' + tag.location,
              '_system'
            );
          }

          if (this.platform.is('android')) {
            window.open(
              'geo://' + '?q=' + tag.location + '(' + tag.name + ')',
              '_system'
            );
          }
        }
      },
      {
        text: 'Cancel',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }
    ];

    if (tag.lost === false) {
      buttons.push(
        {
          text: 'Add Pack Members',
          handler: () => {
            this.mixpanel.track('add_pack_members', { tag: tag.tagId }).then(() => { }).catch(e => {
              console.error('Mixpanel Error', e);
            });

            let alert = this.alertCtrl.create({
              title: `Add Pack Members`,
              message: `Coming soon: Invite other Huan pets to form your own pack!`,
              buttons: [
                {
                  text: 'OK',
                  handler: () => { }
                }
              ]
            });

            alert.present();
          }
        }
      );
    }

    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      title: tag.name,
      buttons: buttons
    });

    actionSheet.onDidDismiss(() => {
      this.resetMap('mainmap');
    });

    actionSheet.present();
  }
}
