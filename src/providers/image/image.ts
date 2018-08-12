import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoadingController } from 'ionic-angular';

import firebase from 'firebase/app';
import 'firebase/storage';

import { Camera } from '@ionic-native/camera';
import { normalizeURL } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import moment from 'moment';
import { AuthProvider } from '../auth/auth';

@Injectable()
export class ImageProvider {
  public myPhotosRef: any;
  public myPhoto: any;
  public myPhotoURL: any;

  constructor(
    private camera: Camera,
    public loadingCtrl: LoadingController,
    private http: HttpClient,
    private utils: UtilsProvider,
    private authProvider: AuthProvider
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
          destinationType: this.camera.DestinationType.FILE_URI,
          quality: 50,
          encodingType: this.camera.EncodingType.JPEG,
          correctOrientation: false,
          saveToPhotoAlbum: false,
          allowEdit: true,
          targetHeight: 500,
          targetWidth: 500
        })
        .then(
          imageData => {
            this.myPhoto = imageData;
            resolve(this.myPhoto);
          },
          error => {
            reject('Unable to retrieve photo: ' + JSON.stringify(error));
          }
        );
    });
  }

  uploadPhoto() {
    console.log('uploadPhoto for ' + normalizeURL(this.myPhoto));

    var imageBlob;

    return new Promise((resolve, reject) => {
      this.http
        .get(normalizeURL(this.myPhoto), {
          observe: 'response',
          responseType: 'blob'
        })
        .subscribe(data => {
          console.log('Received image data: ' + data.body.toString());

          imageBlob = data.body;

          this.authProvider.getUserId().then(uid => {
            let uploadTask = firebase
              .storage()
              .ref()
              .child(
                '/Photos/' +
                  uid +
                  '/' +
                  this.generateTimestamp() +
                  '-' +
                  this.generateUUID() +
                  '/photo.jpeg'
              )
              .put(imageBlob, { contentType: 'image/jpeg' });

            console.log('Started upload task');

            uploadTask.on(
              firebase.storage.TaskEvent.STATE_CHANGED,
              snapshot => {
                var progress =
                  ((<firebase.storage.UploadTaskSnapshot>snapshot)
                    .bytesTransferred /
                    (<firebase.storage.UploadTaskSnapshot>snapshot)
                      .totalBytes) *
                  100;

                console.log('Upload is ' + progress + '% done');

                switch ((<firebase.storage.UploadTaskSnapshot>snapshot).state) {
                  case firebase.storage.TaskState.PAUSED:
                    console.log('Upload is paused');
                    break;
                  case firebase.storage.TaskState.RUNNING:
                    console.log('Upload is running');
                    break;
                }
              },
              error => {
                // Handle unsuccessful uploads
                reject('Unable to upload image: ' + JSON.stringify(error));
              },
              () => {
                resolve(uploadTask.snapshot.downloadURL);
              }
            );
          });
        });
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
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      '-' +
      s4() +
      s4() +
      s4()
    );
  }

  // Display a loading prompt while images are uploading
  presentLoading() {
    let loader = this.loadingCtrl.create({
      content: 'Please wait...',
      duration: 3000
    });
    loader.present();
  }
}
