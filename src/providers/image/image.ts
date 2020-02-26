import { Injectable, Sanitizer } from "@angular/core";
import { LoadingController, Platform } from "ionic-angular";

import { firebase } from "@firebase/app";
import "@firebase/firestore";
import "@firebase/storage";

import { Camera } from "@ionic-native/camera";
import moment from "moment";
import { AuthProvider } from "../auth/auth";
import { base64StringToBlob } from "blob-util";

@Injectable()
export class ImageProvider {
  public myPhotosRef: any;
  public myPhoto: any;
  public myPhotoURL: any;

  constructor(
    private camera: Camera,
    public loadingCtrl: LoadingController,
    private authProvider: AuthProvider,
    private platform: Platform
  ) {}

  setPhoto(url) {
    this.myPhoto = url;
  }

  getPhoto(camera: boolean) {
    return new Promise((resolve, reject) => {
      this.camera
        .getPicture({
          sourceType: camera
            ? this.camera.PictureSourceType.CAMERA
            : this.camera.PictureSourceType.PHOTOLIBRARY,
          destinationType: this.platform.is("cordova")
            ? this.camera.DestinationType.DATA_URL
            : this.camera.DestinationType.FILE_URI,
          quality: 50,
          encodingType: this.camera.EncodingType.JPEG,
          correctOrientation: false,
          saveToPhotoAlbum: false,
          allowEdit: true,
          targetHeight: 512,
          targetWidth: 512
        })
        .then(
          imageData => {
            this.myPhoto = imageData;
            console.info("ImageProvider: Replying with Base64 Image");
            resolve("data:image/jpeg;base64," + this.myPhoto);
          },
          error => {
            reject("Unable to retrieve photo: " + JSON.stringify(error));
          }
        );
    });
  }

  writeImageToDb(blob) {
    return new Promise((resolve, reject) => {
      console.log("Writing image to DB...");

      this.authProvider
        .getUserId()
        .then(uid => {
          let uploadTask = firebase
            .storage()
            .ref()
            .child(
              "/Photos/" +
                // uid +
                // '/' +
                this.generateTimestamp() +
                "-" +
                this.generateUUID() +
                ".jpeg"
              // '/photo.jpeg'
            )
            .put(blob, { contentType: "image/jpeg" })
            .then(
              snap => {
                snap.ref.getDownloadURL().then(u => {
                  console.log("Upload finished: " + u);
                  resolve(u);
                });
              },
              error => {
                console.error("uploadTask: " + JSON.stringify(error));
                reject(JSON.stringify(error));
              }
            )
            .catch(e => {
              console.error("Unable to upload image: " + JSON.stringify(e));
              reject("Unable to upload image: " + JSON.stringify(e));
            });
        })
        .catch(e => {
          console.error("uploadPhoto: " + JSON.stringify(e));
          reject(JSON.stringify(e));
        });
    });
  }

  uploadPhoto(blob = null) {
    return new Promise((resolve, reject) => {
      var imageBlob;

      console.log(
        "Converting image to blob: " + (blob !== null ? blob : this.myPhoto)
      );

      if (blob !== null) {
        resolve(this.writeImageToDb(blob));
      } else {
        try {
          imageBlob = base64StringToBlob(this.myPhoto, "image/jpeg");
          resolve(this.writeImageToDb(imageBlob));
        } catch (e) {
          console.error("base64StringToBlob failed");
          reject(e);
        }
      }
    });
  }

  generateTimestamp() {
    return moment(Date.now()).format();
  }

  // Generate a UUID
  private generateUUID(): string {
    // Implementation
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return (
      s4() +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      s4() +
      s4()
    );
  }

  // Display a loading prompt while images are uploading
  presentLoading() {
    let loader = this.loadingCtrl.create({
      content: "Please wait...",
      duration: 3000
    });
    loader.present();
  }
}
