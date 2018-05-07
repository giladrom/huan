import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// Google Maps API
import {
  // MarkerCluster,
  // MarkerIcon,
  // Marker,
  GoogleMap,
  GoogleMapsEvent,
  LatLng
} from '@ionic-native/google-maps';
import { normalizeURL, PopoverController } from 'ionic-angular';
// import { ShowPage } from '../../pages/show/show';

@Injectable()
export class MarkerProvider {
  private map: GoogleMap;
  private COORDINATE_OFFSET = 0.00003;

  private markers = Array();

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

  addMarker(tag) {
    this.markers[tag.tagId] = 0;

    var locStr = tag.location.toString().split(',');
    var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

    // Add a small offset to the icons to make sure they don't overlap
    latlng.lat += tag.tagId * this.COORDINATE_OFFSET;
    latlng.lng += tag.tagId * this.COORDINATE_OFFSET;

    this.generateAvatar(tag).then(avatar => {
      this.map
        .addMarker({
          icon: avatar,
          flat: true,
          title: tag.name,
          position: latlng
        })
        .then(marker => {
          this.markers[tag.tagId] = marker;

          marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
            //this.navCtrl.push('ShowPage', tag.tagId);
            this.showInfoPopover(tag.tagId);
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
      // var imgData;

      var petImg = new Image();
      var petCanvas;
      petImg.crossOrigin = 'anonymous';
      petImg.src = tag.img;

      petImg.onload = () => {
        let canvas = <HTMLCanvasElement>document.createElement('canvas');
        let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

        canvas.width = 100;
        canvas.height = 100;

        ctx.save();
        ctx.beginPath();
        ctx.arc(35, 35, 35, 0, Math.PI * 2, true);
        ctx.fillStyle = '#a5a5a5';
        ctx.fill();
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(petImg, 0, 0, canvas.width - 30, canvas.height - 30);

        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.closePath();
        ctx.restore();

        petCanvas = canvas;

        var markerImg = new Image();
        markerImg.crossOrigin = 'anonymous';

        if (!tag.lost) {
          markerImg.src = normalizeURL('assets/imgs/marker-green.png');
        } else {
          markerImg.src = normalizeURL('assets/imgs/marker-red.png');
        }

        markerImg.onload = () => {
          let canvas = <HTMLCanvasElement>document.createElement('canvas');
          let ctx: CanvasRenderingContext2D = canvas.getContext('2d');

          console.log('***********************************');
          console.log('Generating avatar for ' + tag.name);
          console.log('***********************************');

          ctx.webkitImageSmoothingEnabled = true;

          canvas.width = markerImg.naturalWidth / 5;
          canvas.height = markerImg.naturalHeight / 5;

          ctx.drawImage(markerImg, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-atop';

          ctx.drawImage(
            petCanvas,
            4,
            3,
            petCanvas.width - 3,
            petCanvas.height - 2
          );

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
    this.markers.forEach(element => {
      element.delete;
      element.remove();

      element = undefined;
    });
  }
}
