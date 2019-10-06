import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  AlertController
} from 'ionic-angular';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, ReplaySubject } from 'rxjs';
import { throwError as observableThrowError } from 'rxjs';
import { map, retry, catchError } from 'rxjs/operators';
import { Mixpanel } from '@ionic-native/mixpanel';
import { UtilsProvider } from '../../providers/utils/utils';
import { NotificationProvider } from '../../providers/notification/notification';
import { AuthProvider } from '../../providers/auth/auth';
import firebase from 'firebase';
const uuidv1 = require('uuid/v1');

@IonicPage()
@Component({
  selector: 'page-rewards',
  templateUrl: 'rewards.html'
})
export class RewardsPage {
  private rewards$: Observable<any[]>;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private selected_reward;
  private reward_level = '3';
  private score = 0;

  private bucket = 'referral';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private afs: AngularFirestore,
    private mixpanel: Mixpanel,
    private utilsProvider: UtilsProvider,
    private notificationProvider: NotificationProvider,
    private alertCtrl: AlertController,
    private authProvider: AuthProvider
  ) {
    this.rewards$ = this.afs
      .collection<any>('Rewards', ref => ref.orderBy('stock', 'asc'))
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
      )
      .takeUntil(this.destroyed$);

    this.utilsProvider
      .getCurrentScore(this.bucket)
      .then(s => {
        this.score = <any>s;
      })
      .catch(e => {
        console.error(e);
      });

    setInterval(() => {
      this.utilsProvider
        .getCurrentScore(this.bucket)
        .then(s => {
          this.score = <any>s;
        })
        .catch(e => {
          console.error(e);
        });
    }, 5000);
  }

  calculateProgress(required_credits) {
    return required_credits - this.score > 0
      ? Math.floor((this.score / required_credits) * 100)
      : 100;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RewardsPage');
  }

  selectReward(reward_id) {
    this.mixpanel
      .track('select_reward', { reward: reward_id })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.selected_reward = reward_id;
  }

  segmentChanged(event) {
    console.log(event);

    this.mixpanel
      .track('segment_changed', { reward_level: this.reward_level })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });
  }

  redeemReward(reward_id, reward_name, credits) {
    this.mixpanel
      .track('redeem_reward', { reward: reward_id, credits: credits })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    let alertBox = this.alertCtrl.create({
      title: 'Redeem Reward',
      message: `You're about to use ${credits} credits. Are you sure?`,
      buttons: [
        {
          text: 'Nope',
          role: 'cancel',
          handler: () => {}
        },

        {
          text: 'Yes!',
          handler: () => {
            this.utilsProvider
              .redeemRewards(credits, this.bucket)
              .then(r => {
                console.log('Redeeming', reward_id);

                const decrement = firebase.firestore.FieldValue.increment(-1);
                const reward_ref = this.afs
                  .collection('Rewards')
                  .doc(reward_id);

                this.authProvider
                  .getUserId()
                  .then(uid => {
                    reward_ref
                      .update({ stock: decrement })
                      .then(() => {
                        console.log('Decrement stock');

                        this.authProvider
                          .getAccountInfo(false)
                          .then(account => {
                            this.authProvider
                              .getUserInfo()
                              .then(user => {
                                this.afs
                                  .collection('Redeem')
                                  .doc(uuidv1())
                                  .set({
                                    reward: reward_id,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                    uid: uid,
                                    name: account.displayName,
                                    email: user.providerData[0].email,
                                    reward_name: reward_name,
                                    credits_redeemed: credits
                                  })
                                  .then(() => {
                                    this.utilsProvider.displayAlert(
                                      'Redeem Successful',
                                      'Congratulations! You will receive a confirmation e-mail shortly.'
                                    );
                                  })
                                  .catch(e => {
                                    this.utilsProvider.displayAlert(
                                      'Uh oh...',
                                      'We were unable to redeem your credits. Please contact support.'
                                    );

                                    console.error('set', e);
                                  });
                              })
                              .catch(e => {
                                console.error('getUserInfo', e);
                              });
                          });
                      })
                      .catch(e => {
                        this.utilsProvider.displayAlert(
                          'Uh oh...',
                          'We were unable to redeem your credits. Please contact support.'
                        );

                        console.error(
                          'Unable to decrement stock',
                          JSON.stringify(e)
                        );
                      });

                    console.log(r);
                  })
                  .catch(e => {
                    console.error('getUserId', e);
                  });
              })
              .catch(e => {
                console.error('redeemReward', JSON.stringify(e));
                this.utilsProvider.displayAlert(
                  'Uh oh...',
                  'There was a problem! Please contact support.'
                );
              });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    alertBox
      .present()
      .then(() => {})
      .catch(e => {
        console.error('redeemReward: ' + JSON.stringify(e));
      });
  }

  sendInvite() {
    this.mixpanel
      .track('earn_credits_clicked')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    let alertBox = this.alertCtrl.create({
      title: 'Huan Credits',
      message:
        'Earn credits by inviting friends! You earn one credit each time your invite is accepted.',
      buttons: [
        {
          text: 'Maybe Later',
          role: 'cancel',
          handler: () => {}
        },

        {
          text: 'Earn Credits!',
          handler: () => {
            this.notificationProvider.updateTokens();

            this.authProvider
              .getAccountInfo(false)
              .then(account => {
                this.utilsProvider
                  .textReferralCode(
                    account.displayName,
                    account.team ? account.team : '',
                    this.notificationProvider.getFCMToken()
                  )
                  .then(r => {
                    console.log('sendInvite', r);

                    this.mixpanel
                      .track('earn_credits_invite_sent')
                      .then(() => {})
                      .catch(e => {
                        console.error('Mixpanel Error', e);
                      });
                  })
                  .catch(e => {
                    console.warn('textReferralCode', e);
                  });
              })
              .catch(e => {
                console.error(
                  'sendInvite(): ERROR: Unable to get account info!',
                  e
                );
              });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    alertBox
      .present()
      .then(() => {})
      .catch(e => {
        console.error('sendInvite: ' + JSON.stringify(e));
      });
  }
}
