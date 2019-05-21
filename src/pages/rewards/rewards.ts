import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable, ReplaySubject } from 'rxjs';
import {
  throwError as observableThrowError,
} from 'rxjs';
import { map, retry, takeUntil, catchError, first } from 'rxjs/operators';
import { Mixpanel } from '@ionic-native/mixpanel';
import { UtilsProvider } from '../../providers/utils/utils';

@IonicPage()
@Component({
  selector: 'page-rewards',
  templateUrl: 'rewards.html',
})
export class RewardsPage {
  private rewards$: Observable<any[]>;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private selected_reward;
  private reward_level = "3";
  private score = 0;

  constructor(public navCtrl: NavController,
    public navParams: NavParams,
    private afs: AngularFirestore,
    private mixpanel: Mixpanel,
    private utilsProvider: UtilsProvider
  ) {
    this.rewards$ = this.afs
      .collection<any>('Rewards')
      .snapshotChanges()
      .pipe(
        catchError(e => observableThrowError(e)),
        retry(2),
        map(actions =>
          actions.map(a => {
            const data = a.payload.doc.data({
              serverTimestamps: 'previous'
            }) as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      ).takeUntil(this.destroyed$);

      this.utilsProvider
        .getCurrentScore('referral')
        .then(s => {
          this.score = <any>s;

          this.score = 5;
        }).catch(e => {
          console.error(e);
        })
  }

  calculateProgress(required_credits) {
    return (required_credits  - this.score) > 0 ? 
      Math.floor((this.score / required_credits) * 100) : 
      100;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RewardsPage');
  }

  selectReward(reward_id) {
    this.mixpanel
    .track('select_reward', { reward: reward_id })
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });
    
    this.selected_reward = reward_id;
   
  }

  segmentChanged(event) {
    console.log(event);

    this.mixpanel
    .track('segment_changed', { reward_level: this.reward_level })
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });
  }

  redeemReward(reward_id, credits) {
    this.mixpanel
    .track('redeem_reward', { reward: reward_id, credits: credits })
    .then(() => { })
    .catch(e => {
      console.error('Mixpanel Error', e);
    });

    console.log("Redeeming", reward_id);
  }
}
