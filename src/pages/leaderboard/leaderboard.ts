import { Component, OnDestroy } from "@angular/core";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import { AngularFirestore } from "@angular/fire/firestore";
import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from "rxjs";
import { catchError, takeUntil, retry, map, windowCount } from "rxjs/operators";
import { InAppBrowser } from "@ionic-native/in-app-browser";

@IonicPage()
@Component({
  selector: "page-leaderboard",
  templateUrl: "leaderboard.html"
})
export class LeaderboardPage implements OnDestroy {
  private rescues$: Observable<any[]>;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private afs: AngularFirestore,
    private iab: InAppBrowser
  ) {}

  ionViewDidLoad() {
    console.log("ionViewDidLoad LeaderboardPage");

    this.rescues$ = this.afs
      .collection("Rescues", ref => ref.orderBy("score", "desc"))
      .snapshotChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        takeUntil(this.destroyed$),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data({
              serverTimestamps: "previous"
            }) as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );
  }

  openUrl(url) {
    this.iab.create(url, "_system");
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
