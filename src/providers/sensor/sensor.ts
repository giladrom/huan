import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { LocationProvider } from "../location/location";
import { AuthProvider } from "../auth/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { Platform } from "ionic-angular";
import { NativeStorage } from "@ionic-native/native-storage";

import * as firebase from "firebase/app";
import "firebase/firestore";

declare var cordova;

@Injectable()
export class SensorProvider {
  private timer;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private locationProvider: LocationProvider,
    private authProvider: AuthProvider,
    private platform: Platform,
    private nativeStorage: NativeStorage
  ) {}

  init() {
    console.log("SensorProvider: Initializing...");

    if (this.platform.is("android")) {
      this.nativeStorage
        .setItem("sensor", true)
        .then(() => {
          console.log("Enabled Sensor Mode in persistent storage");
        })
        .catch((e) => {
          console.error("Unable to enable Sensor Mode: " + e);
        });
    }

    this.authProvider
      .getUserId()
      .then((uid) => {
        this.timer = setInterval(() => {
          console.log("SensorProvider: Updating Location...");

          this.locationProvider
            .getLocation()
            .then((location) => {
              console.log("SensorProvider: Location", location, uid);

              this.afs
                .collection("Sensors")
                .doc(uid)
                .set({
                  location: location,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                })
                .catch((e) => {
                  console.error("SensorProvider", JSON.stringify(e));
                });
            })
            .catch((e) => {
              console.error("SensorProvider", JSON.stringify(e));
            });
        }, 5000);
      })
      .catch((e) => {
        console.error("SensorProvider", JSON.stringify(e));
      });
  }

  stop() {
    console.log("SensorProvider: Shutting Down...");

    clearInterval(this.timer);
  }
}
