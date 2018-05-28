import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// Google Maps API
import {
  // MarkerCluster,
  // MarkerIcon,
  // Marker,
  GoogleMap,
  GoogleMapsEvent,
  LatLng,
  Marker
} from '@ionic-native/google-maps';
import { normalizeURL, PopoverController } from 'ionic-angular';

@Injectable()
export class MarkerProvider {
  private map: GoogleMap;
  private COORDINATE_OFFSET = 0.000001;

  private markers = {};

  private marker_files = [
    'assets/imgs/map-marker-2-128-blue.png',
    'assets/imgs/map-marker-2-128-green.png',
    'assets/imgs/map-marker-2-128-navyblue.png',
    'assets/imgs/map-marker-2-128-orange.png',
    'assets/imgs/map-marker-2-128-pink.png',
    'assets/imgs/map-marker-2-128-red.png'
  ];

  private marker_index = 0;

  constructor(public http: HttpClient, public popoverCtrl: PopoverController) {
    console.log('Hello MarkerProvider Provider');
  }

  init(map) {
    this.map = map;
  }

  exists(index) {
    return this.markers[index] !== undefined;
  }

  isValid(index) {
    return this.exists(index) && this.markers[index] != 0;
  }

  getLatLngArray() {
    var latlngArray = [];

    for (var key in this.markers) {
      var marker: Marker = <Marker>this.markers[key];
      latlngArray.push(marker.getPosition());
    }

    return latlngArray;
  }

  spaceOutMarkers(level) {
    var index = 0;
    for (var key in this.markers) {
      index++;

      if (this.isValid(key)) {
        var marker: Marker = <Marker>this.markers[key];

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
  }

  addMarker(tag): Promise<any> {
    return new Promise((resolve, reject) => {
      this.markers[tag.tagId] = 0;

      var locStr = tag.location.toString().split(',');
      var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

      this.generateAvatar(tag).then(avatar => {
        this.map
          .addMarker({
            icon: avatar,
            flat: true,
            // title: tag.name,
            position: latlng
          })
          .then(marker => {
            this.markers[tag.tagId] = marker;

            // FIXME: Add a radius around markers
            // this.map
            //   .addCircle({
            //     center: latlng,
            //     radius: 10,
            //     strokeColor: '#214a55',
            //     strokeWidth: 1,
            //     fillColor: 'rgb(33, 74, 85, 0.1)'
            //   })
            //   .then(circle => {
            //     circle.setZIndex(0);
            //     marker.setZIndex(1);
            //     circle.bindTo('position', marker, 'center');
            //   });

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
      return this.markers[index];
    } else {
      return false;
    }
  }

  deleteMarker(index) {
    if (this.exists(index)) {
      this.markers[index].delete;
      this.markers[index].remove();

      this.markers[index] = undefined;
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

        canvas.width = 120;
        canvas.height = 120;

        // Size of the round clipped image
        var size = 42;

        ctx.save();
        ctx.beginPath();
        ctx.arc(size, size, size, 0, Math.PI * 2, true);
        ctx.fillStyle = '#a5a5a5';
        ctx.fill();
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(petImg, 0, 0, canvas.width - 30, canvas.height - 30);

        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        petCanvas = canvas;

        var markerImg = new Image();
        markerImg.crossOrigin = 'anonymous';

        if (!tag.lost) {
          markerImg.src = normalizeURL(this.marker_files[this.marker_index]);
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

          canvas.width = markerImg.naturalWidth;
          canvas.height = markerImg.naturalHeight;

          ctx.drawImage(markerImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';

          // Draw clipped image unto marker
          ctx.drawImage(petCanvas, 22, 6, petCanvas.width, petCanvas.height);

          ctx.translate(0.5, 0.5);
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
        cssClass: 'show-info-popover'
      }
    );

    popover.present();
  }

  destroy() {
    for (var key in this.markers) {
      console.log('Removing marker for ' + key);
      this.deleteMarker(key);
    }
  }
}
