import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavController, 
  AlertController, 
  LoadingController } from 'ionic-angular';

import { AngularFireModule } from 'angularfire2';
import { AngularFirestore, 
  AngularFirestoreCollection } from 'angularfire2/firestore';
import firebase from 'firebase/app';
import 'firebase/storage';

import { Camera, CameraOptions } from '@ionic-native/camera';
import { Tag } from '../../providers/tag/tag';

/*
  Generated class for the ImageProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class ImageProvider {
  public myPhotosRef: any;
  public myPhoto: any;
  public myPhotoURL: any;

  constructor(private camera: Camera,
    public loadingCtrl: LoadingController) { 

      this.myPhotosRef = firebase.storage().ref('/Photos/');

    }

  takePhoto() {
    return new Promise((resolve, reject) => {
      this.camera.getPicture({
        sourceType: this.camera.PictureSourceType.CAMERA,
        destinationType: this.camera.DestinationType.DATA_URL,
        quality: 75,
        encodingType: this.camera.EncodingType.PNG,
        saveToPhotoAlbum: false,
        targetHeight: 500,
        targetWidth: 500
      }).then(imageData => {
        this.presentLoading();

        this.myPhoto = imageData;
        resolve(this.uploadPhoto());
      }, error => {
        reject("Unable to take photo: " + JSON.stringify(error));
      });
    });
  }
 
  selectPhoto() {
    return new Promise((resolve, reject) => {
      this.camera.getPicture({
        sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
        destinationType: this.camera.DestinationType.DATA_URL,
        quality: 75,
        encodingType: this.camera.EncodingType.PNG,
        targetHeight: 1280,
        targetWidth: 1080,
      }).then(imageData => {
        this.presentLoading();

        this.myPhoto = imageData;
        resolve(this.uploadPhoto());
      }, error => {
        reject("Unable to select photo: " + JSON.stringify(error));
      });
    });
  }
 
  uploadPhoto() {
    console.log("uploadPhoto");

    return new Promise((resolve, reject) => {
      var uploadTask = this.myPhotosRef.child(this.generateUUID()).child('myPhoto.png')
        .putString(this.myPhoto, 'base64', { contentType: 'image/png' });

      // Register three observers:
      // 1. 'state_changed' observer, called any time the state changes
      // 2. Error observer, called on failure
      // 3. Completion observer, called on successful completion
      uploadTask.on('state_changed', function (snapshot) {
        // Observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log('Upload is paused');
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            console.log('Upload is running');
            break;
        }
      }, function (error) {
        // Handle unsuccessful uploads
        reject("Unable to upload image: " + JSON.stringify(error));
      }, function () {
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        console.log("Upload done");
        var downloadURL = uploadTask.snapshot.downloadURL;
        
        resolve(downloadURL);
      });
    });
  }

  // Generate a UUID
  private generateUUID(): string {
    // Implementation
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
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
