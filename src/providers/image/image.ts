import { Injectable, Sanitizer } from "@angular/core";
import { LoadingController, Platform } from "ionic-angular";

import { firebase } from "@firebase/app";
import "@firebase/firestore";
import "@firebase/storage";

import { Camera } from "@ionic-native/camera";
import moment from "moment";
import { AuthProvider } from "../auth/auth";
import { base64StringToBlob } from "blob-util";
import { UtilsProvider } from "../../providers/utils/utils";
import { AngularFireFunctions } from "@angular/fire/functions";

@Injectable()
export class ImageProvider {
  public myPhotosRef: any;
  public myPhoto: any;
  public myPhotoURL: any;

  constructor(
    private camera: Camera,
    public loadingCtrl: LoadingController,
    private authProvider: AuthProvider,
    private platform: Platform,
    private utilsProvider: UtilsProvider,
    private afFunc: AngularFireFunctions
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
      this.afFunc
        .httpsCallable("uploadPhoto")({
          blob: blob
        })
        .subscribe(
          r => {
            console.log("uploadPhoto success", JSON.stringify(r));
            resolve(r.message);
          },
          error => {
            console.error("uploadPhoto error", JSON.stringify(error));
            reject();
          }
        );

      // const filename = "/Photos/" + this.utilsProvider.generateUUID() + ".jpeg";
      // console.log(`Writing image to DB as ${filename}...`);

      // try {
      //   const uploadTask = await firebase
      //     .storage()
      //     .ref()
      //     .child(filename)
      //     .put(blob, { contentType: "image/jpeg" });

      //   console.log("Waiting for upload to finish...");

      //   await uploadTask.ref
      //     .getDownloadURL()
      //     .then(url => {
      //       console.log("Upload Completed");

      //       resolve(url);
      //     })
      //     .catch(e => {
      //       reject(e);
      //     });
      // } catch (e) {
      //   console.error("Upload Image", e);
      //   reject(e);
      // }
    });
  }

  uploadPhoto(blob = null) {
    return new Promise((resolve, reject) => {
      this.writeImageToDb(this.myPhoto)
        .then(r => {
          resolve(r);
        })
        .catch(e => {
          reject(e);
        });

      // var imageBlob;

      // console.log(
      //   "Converting image to blob: " + (blob !== null ? blob : this.myPhoto)
      // );

      // if (blob !== null) {
      //   console.log("Blob already exists");

      //   resolve(this.writeImageToDb(blob));
      // } else {
      //   console.log("Creating new Blob");

      //   try {
      //     imageBlob = base64StringToBlob(this.myPhoto, "image/jpeg");
      //     this.writeImageToDb(imageBlob)
      //       .then(r => {
      //         resolve(r);
      //       })
      //       .catch(e => {
      //         reject(e);
      //       });
      //   } catch (e) {
      //     console.error("base64StringToBlob failed");
      //     reject(e);
      //   }
      // }
    });
  }

  generateTimestamp() {
    return moment(Date.now()).format();
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
