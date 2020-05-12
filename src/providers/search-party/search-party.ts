import { HttpClient } from "@angular/common/http";
import { Injectable, OnDestroy } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";

const uuidv1 = require("uuid/v1");

export interface PartyMember {
  uid: string;
  name: string;
  joined: any;
  location: any;
  locationUpdated: any;
}

export interface SearchParty {
  owner: string;
  name: string;
  tagId: any;
  created: any;
  members: PartyMember[];
}

/*
  Search Party Mode

  When a pet is missing, the owner can create a Search Party and invite other users to participate.   
*/

@Injectable()
export class SearchPartyProvider implements OnDestroy {
  private active = false;

  constructor(public http: HttpClient, private afFunc: AngularFireFunctions) {}

  init() {
    (window as any).BackgroundGeolocation.configure({
      locationProvider: (window as any).BackgroundGeolocation.ACTIVITY_PROVIDER,
      desiredAccuracy: (window as any).BackgroundGeolocation.HIGH_ACCURACY,
      stationaryRadius: 50,
      distanceFilter: 50,
      notificationTitle: "Background tracking",
      notificationText: "enabled",
      debug: false,
      interval: 10000,
      fastestInterval: 5000,
      activitiesInterval: 10000,
      pauseLocationUpdates: false,
      // url: 'http://192.168.81.15:3000/location',
      // httpHeaders: {
      //   'X-FOO': 'bar'
      // },
      // customize post properties
      postTemplate: {
        lat: "@latitude",
        lon: "@longitude",
        foo: "bar" // you can also add your own properties
      }
    });

    (window as any).BackgroundGeolocation.on("start", () => {
      console.log("[DEBUG] BackgroundGeolocation has been started");
    });

    (window as any).BackgroundGeolocation.on("stop", () => {
      console.log("[DEBUG] BackgroundGeolocation has been stopped");
    });

    (window as any).BackgroundGeolocation.on("error", ({ message }) => {
      console.error("BackgroundGeolocation error", message);
    });

    (window as any).BackgroundGeolocation.on("location", location => {
      (window as any).BackgroundGeolocation.startTask(taskKey => {
        console.log(
          "[DEBUG] BackgroundGeolocation location",
          JSON.stringify(location)
        );

        this.updateLocation(location)
          .then(r => {
            (window as any).BackgroundGeolocation.endTask(taskKey);
          })
          .catch(e => {
            (window as any).BackgroundGeolocation.endTask(taskKey);

            console.error(e);
          });
      });
    });
  }

  start() {
    this.active = true;
    (window as any).BackgroundGeolocation.start();
  }

  stop() {
    this.active = false;
    (window as any).BackgroundGeolocation.stop();
  }

  isActive() {
    return this.active;
  }

  updateLocation(location) {
    return new Promise((resolve, reject) => {
      const sub = this.afFunc
        .httpsCallable("updateSearchPartyLocation")({
          location: location
        })
        .subscribe(
          r => {
            sub.unsubscribe();

            console.log("bulkUpdateTags success", JSON.stringify(r));
            resolve();
          },
          error => {
            sub.unsubscribe();

            console.error("bulkUpdateTags error", JSON.stringify(error));
            reject(error);
          }
        );
    });
  }

  create(tag) {
    return new Promise((resolve, reject) => {
      const sub = this.afFunc
        .httpsCallable("createSearchParty")({
          tag: tag
        })
        .subscribe(
          r => {
            sub.unsubscribe();

            console.log("createSearchParty success", JSON.stringify(r));
            resolve();
          },
          error => {
            sub.unsubscribe();

            console.error("createSearchParty error", JSON.stringify(error));
            reject(error);
          }
        );
    });
  }

  remove() {}

  ngOnDestroy() {
    this.stop();
  }
}
