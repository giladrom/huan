import { Component, OnDestroy } from "@angular/core";
import { IonicPage, NavController, NavParams, ViewController } from "ionic-angular";
import { AngularFirestore } from "@angular/fire/firestore";
import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from "rxjs";
import { catchError, takeUntil, retry, map, windowCount, first, take } from "rxjs/operators";
import { InAppBrowser } from "@ionic-native/in-app-browser";
import { UtilsProvider } from "../../providers/utils/utils";
import { AuthProvider } from "../../providers/auth/auth";

@IonicPage()
@Component({
  selector: "page-leaderboard",
  templateUrl: "leaderboard.html"
})
export class LeaderboardPage implements OnDestroy {
  private leaders$: Observable<any[]>;
  private pets = [];
  private pet_icons = [];
  private isEmpty = true;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private afs: AngularFirestore,
    private iab: InAppBrowser,
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider
  ) { }

  ionViewDidLoad() {
    console.log("ionViewDidLoad LeaderboardPage");

    this.authProvider.getUserInfo().then(account => {
      console.log(JSON.stringify(account));
    }).catch(e => {
      console.error(e);
    })

    this.leaders$ = this.afs
      .collection("Users",
        ref => ref.orderBy('score.current', 'desc').limit(10))
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

            var name;

            try {
              var names = data.account.displayName.split(' ');

              if (names.length > 1) {
                var lastname = names[1].charAt(0);
                name = `${names[0]} ${lastname}.`;
              } else {
                name = names[0];
              }
            } catch (e) {
              name = 'Anonymous';
            }

            data.account.displayName = name;
            const id = a.payload.doc.id;



            return { id, ...data };

          })
        )
      );

    this.leaders$.pipe(take(2)).subscribe(users => {
      users.forEach(user => {
        this.afs.collection("Tags",
          ref => ref.where('uid', 'array-contains', user.id))
          .get()
          .pipe(
            take(1)
          )
          .subscribe(r => {
            this.pets[user.id] = r.size;

            this.pet_icons[user.id] = [];
            for (let i = 0; i < r.size; i++) {
              let rand = this.utilsProvider.randomIntFromInterval(1, 8);

              this.pet_icons[user.id].push(
                `assets/imgs/active_user-${rand}.png`
              );
            }

            console.log(user.id, this.pet_icons[user.id]);
          }, error => {
            console.error(error);
          })
      });
    })
  }

  getPetIcons(id) {

    try {
      return this.pet_icons[id];
    } catch (e) {
      return [];
    }
  }


  getPets(id) {
    try {
      return this.pets[id];
    } catch (e) {
      return 0;
    }
  }

  openUrl(url) {
    this.iab.create(url, "_system");
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  dismiss() {
    this.viewCtrl.dismiss().then(() => {
      console.log("Dismissed");
    });
  }
}
