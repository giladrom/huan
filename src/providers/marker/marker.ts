import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';

// Google Maps API
import {
  // MarkerCluster,
  // MarkerIcon,
  // Marker,
  GoogleMap,
  GoogleMapsEvent,
  LatLng,
  Marker,
  GoogleMaps,
  GoogleMapOptions,
  GoogleMapsAnimation
} from '@ionic-native/google-maps';
import { normalizeURL, PopoverController } from 'ionic-angular';
import { ValueTransformer } from '../../../node_modules/@angular/compiler/src/util';
import { Pro } from '@ionic/pro';
import { ReplaySubject } from '../../../node_modules/rxjs/ReplaySubject';

@Injectable()
export class MarkerProvider implements OnDestroy {
  // Map variables
  private map: GoogleMap = null;
  mapReady: boolean = false;
  firstLoad: boolean = true;

  private COORDINATE_OFFSET = 0.000001;

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

  constructor(public http: HttpClient, public popoverCtrl: PopoverController) {
    console.log('Hello MarkerProvider Provider');
  }

  init(mapElement) {
    let mapOptions: GoogleMapOptions = {
      controls: {
        compass: false,
        myLocationButton: true,
        indoorPicker: false,
        zoom: false
      },
      gestures: {
        scroll: true,
        tilt: false,
        rotate: true,
        zoom: true
      }
    };

    if (!this.map) {
      try {
        this.map = GoogleMaps.create(mapElement, mapOptions);
        this.map.setMyLocationEnabled(true);
      } catch (error) {
        Pro.monitoring.log('GoogleMaps.create Error: ' + error, {
          level: 'error'
        });
        console.error('GoogleMaps.create Error: ' + JSON.stringify(error));
      }
    }

    this.map
      .one(GoogleMapsEvent.MAP_READY)
      .then(() => {
        this.mapReady = true;
      })
      .catch(error => {
        Pro.monitoring.log('map.one Error: ' + error, {
          level: 'error'
        });
        console.error('map.one Error: ' + JSON.stringify(error));
      });
  }

  resetMap(mapElement) {
    if (this.map) {
      this.map.setDiv(mapElement);
      this.map.setVisible(true);
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

  showAllMarkers() {
    var latLngArray = this.getLatLngArray();

    if (this.mapReady) {
      this.map.animateCamera({
        target: latLngArray,
        zoom: 15,
        duration: 500
      });
    }
  }

  getLatLngArray() {
    var latlngArray = [];

    console.log('getLatLngArray()');

    this.markers.forEach((value, key) => {
      console.log('key: ' + key);

      var marker: Marker = <Marker>value;

      if (typeof marker.getPosition === 'function') {
        latlngArray.push(marker.getPosition());
      }
    });

    return latlngArray;
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
      console.log('Marker icon: ' + this.report_marker_files[report.report]);

      var locStr = report.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

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
          this.markers.set(report.id, marker);

          marker.setZIndex(2);

          resolve(marker);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  addMarker(tag): Promise<any> {
    // Set an initial value to prevent duplicate markers from being created,
    // since the generateAvatar function takes a while to initialize
    this.markers.set(tag.tagId, 0);

    return new Promise((resolve, reject) => {
      // this.markers[tag.tagId] = 0;

      var locStr = tag.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      this.generateAvatar(tag).then(avatar => {
        this.map
          .addMarker({
            icon: {
              url: avatar,
              size: {
                width: 512 / 4,
                height: 512 / 4
              }
            },
            flat: true,
            // title: tag.name,
            position: latlng
          })
          .then(marker => {
            this.markers.set(tag.tagId, marker);

            this.map
              .addCircle({
                center: latlng,
                radius: 10,
                strokeColor: '#214a55',
                strokeWidth: 1,
                fillColor: 'rgb(33, 74, 85, 0.1)'
              })
              .then(circle => {
                circle.setZIndex(0);
                marker.setZIndex(1);
                marker.bindTo('position', circle, 'center');
              });

            resolve(marker);
          })
          .catch(error => {
            reject(error);
          });
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
    if (this.exists(index)) {
      if (typeof this.markers.get(index).remove === 'function') {
        this.markers.get(index).remove();
      }

      this.markers.delete(index);
    }
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
        var size = 150;

        ctx.save();
        ctx.beginPath();
        ctx.arc(260, 215, size, 0, Math.PI * 2, true);
        ctx.fillStyle = '#a5a5a5';
        ctx.fill();
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(petImg, 25, 25, petImg.width * 0.8, petImg.height * 0.8);

        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        petCanvas = canvas;

        var markerImg = new Image();
        markerImg.crossOrigin = 'anonymous';

        if (!tag.lost) {
          // markerImg.src = normalizeURL(this.marker_files[this.marker_index]);
          markerImg.src = normalizeURL('assets/imgs/marker.png');
        } else {
          // TODO: Create special marker for lost pets
          markerImg.src = normalizeURL(this.marker_files[this.marker_index]);
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

          ctx.webkitImageSmoothingEnabled = true;

          canvas.width = markerImg.width;
          canvas.height = markerImg.height;

          ctx.drawImage(markerImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';

          // Draw clipped image unto marker
          ctx.drawImage(petCanvas, 22, 1, petCanvas.width, petCanvas.height);

          // ctx.translate(0.5, 0.5);
          ctx.restore();

          resolve(canvas.toDataURL());
        };
      };
    });
  }

  showInfoPopover(tagId, anonymous = false) {
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
}
