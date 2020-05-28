import { Component, OnDestroy } from "@angular/core";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import {
  ReplaySubject,
  Observable,
  throwError as observableThrowError,
} from "rxjs";
import { AngularFirestore } from "@angular/fire/firestore";

import "rxjs/add/operator/throttleTime";

import moment from "moment";
import { catchError, retry, map } from "rxjs/operators";
import { Mixpanel } from "@ionic-native/mixpanel";
import { MarkerProvider } from "../../providers/marker/marker";
import { LatLng } from "@ionic-native/google-maps";
import { UtilsProvider } from "../../providers/utils/utils";

@IonicPage()
@Component({
  selector: "page-huan-pack",
  templateUrl: "huan-pack.html",
})
export class HuanPackPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  events$: Observable<any[]>;
  updated_tags: number = 0;
  tags_added_today: number = 0;
  interval: any;
  border_color: string[] = [
    "#731283",
    "#1054FD",
    "#0F812D",
    "#FFEC34",
    "#FD8C26",
    "#E00A18",
  ];
  border_color_index: number = 0;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private afs: AngularFirestore,
    private mixpanel: Mixpanel,
    private markerProvider: MarkerProvider,
    private utilsProvider: UtilsProvider
  ) {
    this.events$ = this.afs
      .collection("communityEvents", (ref) =>
        ref.orderBy("timestamp", "desc").limit(50)
      )
      .snapshotChanges()
      .pipe(
        catchError((e) => observableThrowError(e)),
        retry(2)
      )
      .takeUntil(this.destroyed$)
      .pipe(
        map((actions) => {
          return actions
            .map((a) => {
              const data: any = a.payload.doc.data();
              const name = data.name;
              return { name, ...data };
            })
            .filter((name, i, array) => {
              return array.includes(name);
            });
        })
      );
  }

  getBorderColor(event) {
    if (event.event === "new_pet") {
      return {
        background: "orange",
      };
    }

    if (event.event === "new_pet_img") {
      const rgba = "rgba(254, 112, 83, 1)";

      return {
        background: "grey",
      };
    }

    if (event.event === "pet_marked_as_lost") {
      return {
        background: "#F94A47",
      };
    }

    if (event.event === "pet_marked_as_found") {
      return {
        background: "linear-gradient( #29C4F9, #1F6FED)",
      };
    }

    if (event.event === "pet_seen_away_from_home") {
      return {
        background: "linear-gradient( #7FDE49, #29630D)",
      };
    }
  }

  showOnMap(location) {
    try {
      console.log("Showing marker at " + location);

      if (location) {
        this.mixpanel
          .track("show_lost_marker_on_map", { location: location })
          .then(() => {})
          .catch((e) => {
            console.error("Mixpanel Error", e);
          });

        var locStr = location.split(",");
        var latlng = new LatLng(Number(locStr[0]), Number(locStr[1]));

        this.markerProvider.getMap().moveCamera({
          target: latlng,
          zoom: 15,
          duration: 2000,
        });

        // Switch to Map Tab
        this.navCtrl.parent.select(0);
      }
    } catch (e) {
      console.error("showOnMap: " + JSON.stringify(e));
    }
  }

  share(event) {
    this.utilsProvider.share(
      `${event.name} is missing in ${event.community}! Please join Huan and help ${event.name} return home.`,
      `${event.name} is missing!`,
      event.url ? event.url : "https://fetch.gethuan.com/mobile",
      "Share Huan"
    );
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad HuanPackPage");

    var beginningDate = Date.now() - 3600000;
    var beginningDateObject = new Date(beginningDate);

    this.afs
      .collection("Tags")
      .ref.where("tagattached", "==", true)
      .where("lastseen", ">", beginningDateObject)
      .get()
      .then((snapshot) => {
        var int = setInterval(() => {
          this.updated_tags++;

          if (this.updated_tags >= snapshot.size) {
            clearInterval(int);
          }
        }, 10);
      })
      .catch((e) => {
        console.error("Unable to retrieve tag: " + e);
      });

    var oneDayAgo = Date.now() - 3600000 * 24;
    var oneDayAgoObject = new Date(oneDayAgo);

    this.afs
      .collection("Tags")
      .ref.where("tagattached", "==", false)
      .where("lastseen", ">", oneDayAgoObject)
      .get()
      .then((snapshot) => {
        var int = setInterval(() => {
          this.tags_added_today++;

          if (this.tags_added_today == snapshot.size) {
            clearInterval(int);
          }
        }, 10);
      })
      .catch((e) => {
        console.error("Unable to retrieve tag: " + e);
      });
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("huan_pack_page")
      .then(() => {})
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.interval = setInterval(() => {
      var beginningDate = Date.now() - 3600000;
      var beginningDateObject = new Date(beginningDate);

      this.afs
        .collection("Tags")
        .ref.where("tagattached", "==", true)
        .where("lastseen", ">", beginningDateObject)
        .get()
        .then((snapshot) => {
          this.updated_tags = snapshot.size;
        })
        .catch((e) => {
          console.error("Unable to retrieve tag: " + e);
        });
    }, 5000);
  }

  ionViewWillLeave() {
    clearInterval(this.interval);
  }

  showTime(timestamp) {
    return moment.unix(timestamp.toDate() / 1000).fromNow();
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
