import { takeUntil, sample, catchError, retry } from 'rxjs/operators';
import { Injectable, OnDestroy } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { Facebook } from '@ionic-native/facebook';
import { Platform, normalizeURL } from 'ionic-angular';
import {
  ReplaySubject,
  Subject,
  BehaviorSubject,
  Subscription,
  throwError as observableThrowError
} from 'rxjs';

import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { Settings } from '../settings/settings';
import { LocationProvider } from '../location/location';
import { Mixpanel, MixpanelPeople } from '@ionic-native/mixpanel';

export interface UserAccount {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  address?: string;
  team?: string;
}

@Injectable()
export class AuthProvider implements OnDestroy {
  private destroyed$: ReplaySubject<boolean>;
  private info$: BehaviorSubject<any> = new BehaviorSubject(null);
  private verificationId;
  private accountSubscription: Subscription = new Subscription();
  private authSubscription: Subscription = new Subscription();

  private auth$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private control_auth$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  private win: any = window;

  private newUser: Boolean = false;

  constructor(
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private fb: Facebook,
    private platform: Platform,
    private geolocation: NativeGeocoder,
    private locationProvider: LocationProvider,
    private mixpanel: Mixpanel,
    private mixpanelPeople: MixpanelPeople
  ) {}

  init() {
    console.log('AuthProvider: Initializing...');

    this.destroyed$ = new ReplaySubject(1);
    this.auth$ = new BehaviorSubject<any>(null);

    this.platform.ready().then(() => {
      const subscription = this.afAuth.auth.onAuthStateChanged(
        user => {
          if (user) {
            this.mixpanel
              .registerSuperProperties({ uid: user.uid })
              .then(() => {})
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            console.log('AuthProvider: Received user info for ' + user.uid);

            this.auth$.next(user);
            this.control_auth$.next(true);
          }
        },
        err => {
          this.auth$.next(err);

          console.error('AuthProvider: Unable to retrieve user info: ' + err);
        }
      );

      this.authSubscription.add(subscription);
    });
  }

  isNewUser() {
    return this.newUser;
  }

  getAuth() {
    return this.afAuth.auth;
  }

  stop() {
    // this.mixpanel
    //   .track('App Shutdown')
    //   .then(() => { })
    //   .catch(e => {
    //     console.error('Mixpanel Error', e);
    //   });

    console.log('AuthProvider: Shutting down...');

    if (this.destroyed$) {
      this.destroyed$.next(true);
      this.destroyed$.complete();
    }

    this.accountSubscription.unsubscribe();
    this.authSubscription.unsubscribe();

    this.auth$.next(null);
    this.auth$.complete();
  }

  getUserId(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sub = new Subject();
      this.auth$
        .pipe(
          takeUntil(sub),
          sample(this.control_auth$)
        )
        .subscribe(
          user => {
            if (user) {
              sub.next();
              sub.complete();

              resolve(user.uid);
            }
          },
          err => {
            console.error('getUserId(): unable to resolve user: ' + err);

            reject(err);
          }
        );
    });
  }

  // FIXME: This function will return an error if login takes too long
  getUserInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sub = new Subject();

      let subscription = this.auth$
        .pipe(
          takeUntil(sub),
          sample(this.control_auth$)
        )
        .subscribe(
          user => {
            if (user) {
              console.log('getUserInfo(): resolving user');

              sub.next();
              sub.complete();

              resolve(user);
            }
          },
          err => {
            console.error('getUserInfo(): unable to resolve user');
            reject(err);
          }
        );
    });
  }

  setUserInfo(account) {
    return new Promise((resolve, reject) => {
      this.getUserInfo()
        .then(user => {
          this.afs
            .collection('Users')
            .doc(user.uid)
            .update({ account: account })
            .then(() => {
              // // Update DB with home address coordinates
              this.geolocation
                .forwardGeocode(account.address)
                .then(res => {
                  console.log(
                    '### Resolved home address: ' + JSON.stringify(res)
                  );

                  this.locationProvider
                    .getCommunityId(false, res[0])
                    .then(community => {
                      this.afs
                        .collection('Users')
                        .doc(user.uid)
                        .update({
                          'settings.communityNotificationString': community
                        })
                        .then(() => {
                          console.log('Updated home community', community);
                        })
                        .catch(e => {
                          console.error(
                            'setUserInfo: Update community string',
                            e
                          );
                        });
                    })
                    .catch(e => {
                      console.error('setUserInfo: getCommunityId', e);
                    });

                  this.afs
                    .collection('Users')
                    .doc(user.uid)
                    .update({
                      'account.address_coords':
                        res[0].latitude + ',' + res[0].longitude
                    })
                    .then(() => {
                      console.log('### Initialized home coordinates');
                    })
                    .catch(e => {
                      console.error(
                        '### Unable to initialize home coordinates: ' +
                          JSON.stringify(e)
                      );
                    });
                })
                .catch(e => {
                  console.error(
                    'Unable to resolve home address coordinates: ' +
                      JSON.stringify(e)
                  );
                });
            });

          resolve(true);
        })
        .catch(error => {
          console.error('Unable to update user info: ' + error);
          reject(error);
        });
    });
  }

  getAccountInfo(subscription = false): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getUserInfo()
        .then(user => {
          if (subscription === false) {
            var unsubscribe = this.afs
              .collection('Users')
              .doc(user.uid)
              .valueChanges()
              .pipe(
                catchError(e => observableThrowError(e)),
                retry(10),
                takeUntil(this.destroyed$)
              )
              .subscribe(doc => {
                const account: any = doc;
                unsubscribe.unsubscribe();

                if (account.account) {
                  resolve(account.account);
                } else {
                  console.error(
                    'getAccountInfo: Unable to find account info for user ' +
                      user.uid
                  );
                  reject(
                    'getAccountInfo: Unable to find account info for user ' +
                      user.uid
                  );
                }
              });
          } else {
            this.afs
              .collection('Users')
              .doc(user.uid)
              .valueChanges()
              .pipe(
                catchError(e => observableThrowError(e)),
                retry(10),
                takeUntil(this.destroyed$)
              )
              .subscribe(doc => {
                const account: any = doc;

                if (account !== null) {
                  try {
                    if (account.account !== undefined) {
                      // Update DB with initial invite allocation
                      if (account.account.invites === undefined) {
                        console.warn('### Initializing invites');
                        this.afs
                          .collection('Users')
                          .doc(user.uid)
                          .update({
                            'account.invites': 5,
                            'account.email': user.providerData[0].email
                          })
                          .then(() => {
                            console.log('### Initialized Invites');
                          })
                          .catch(e => {
                            console.error(
                              '### Unable to initialize invites: ' +
                                JSON.stringify(e)
                            );
                          });
                      }

                      console.log(
                        'getAccountInfo: Pushing ' +
                          JSON.stringify(account.account)
                      );

                      var props = {
                        $name: account.account.displayName,
                        $phone: account.account.phoneNumber,
                        $signin: user.providerData[0].providerId,
                        $email: user.providerData[0].email,
                        $team: account.account.team
                      };

                      this.mixpanel
                        .distinctId()
                        .then(distinctId => {
                          console.log('Mixpanel Distinct ID', distinctId);

                          this.mixpanel
                            .identify(distinctId)
                            .then(ident => {
                              console.log(
                                'Mixpanel People',
                                JSON.stringify(ident)
                              );
                            })
                            .catch(e => {
                              console.error('Mixpanel People Error', e);
                            });

                          this.mixpanelPeople
                            .set(props)
                            .then(() => {
                              console.log(
                                'Mixpanel People',
                                JSON.stringify(props)
                              );
                            })
                            .catch(e => {
                              console.error('Mixpanel People Error', e);
                            });
                        })
                        .catch(e => {
                          console.error('Mixpanel People Error', e);
                        });

                      this.info$.next(account.account);
                      resolve(this.info$);
                    }
                  } catch {
                    console.error(
                      'AuthProvider: Unable to get existing account info'
                    );
                  }
                }
              });
          }
        })
        .catch(error => {
          reject('getAccountInfo:' + error);
        });
    });
  }

  setTeam(team) {
    return new Promise((resolve, reject) => {
      this.getUserInfo().then(user => {
        if (!team) {
          team = 'none';
        }

        this.afs
          .collection('Users')
          .doc(user.uid)
          .update({ 'account.team': team })
          .then(() => {
            console.log('Set Team', team);

            this.mixpanelPeople
              .set({ team: team })
              .then(() => {})
              .catch(e => {
                console.error('Mixpanel People Error', e);
              });

            resolve(true);
          })
          .catch(e => {
            console.error('Set Team' + JSON.stringify(e));
            reject(false);
          });
      });
    });
  }

  updateReferralCount(referrals: number) {
    return new Promise((resolve, reject) => {
      this.getUserInfo().then(user => {
        this.afs
          .collection('Users')
          .doc(user.uid)
          .update({ 'account.referrals': referrals })
          .then(() => {
            this.mixpanelPeople
              .set({ referrals: referrals })
              .then(() => {})
              .catch(e => {
                console.error('Mixpanel People Error', e);
              });

            resolve(referrals);
          })
          .catch(e => {
            console.error(
              '### Unable to update referral count: ' + JSON.stringify(e)
            );
            reject(e);
          });
      });
    });
  }

  getSubscriptionInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getUserInfo().then(user => {
        var unsubscribe = this.afs
          .collection('Users')
          .doc(user.uid)
          .ref.onSnapshot(doc => {
            unsubscribe();

            if (doc.exists) {
              resolve(doc.data().subscription);
            } else {
              console.error(
                'Unable to find subscription info for user ' + user.uid
              );
              reject('Unable to find subscription info for user ' + user.uid);
            }
          });
      });
    });
  }

  initializeSettings(user, signin, name): Promise<any> {
    return new Promise((resolve, reject) => {
      let settings: Settings = {
        regionNotifications: false,
        communityNotifications: true,
        communityNotificationString: '',
        tagNotifications: false,
        enableMonitoring: true,
        monitoringFrequency: 2,
        showWelcome: true,
        shareContactInfo: true,
        highAccuracyMode: false,
        sensor: false
      };

      let account: UserAccount;

      if (
        user.providerData[0] !== undefined &&
        (user.providerData[0].providerId === 'facebook.com' ||
          user.providerData[0].providerId === 'google.com')
      ) {
        console.log('*** Facebook/Google login detected');

        account = {
          displayName: user.displayName,
          photoURL: user.photoURL,
          team: ''
        };
      } else {
        account = {
          displayName: name,
          photoURL: normalizeURL('assets/imgs/anonymous2.png'),
          phoneNumber: '',
          address: '',
          team: ''
        };
      }

      this.mixpanelPeople
        .set({
          $name: account.displayName,
          $signin: user.providerData[0].providerId,
          $team: account.team
        })
        .then(() => {})
        .catch(e => {
          console.error('Mixpanel People Error', e);
        });

      this.afs
        .collection<String>('Users')
        .doc(user.uid)
        .set(
          {
            settings: settings,
            account: account,
            signin: signin
          },
          { merge: true }
        )
        .then(() => {
          console.log(
            'AuthProvider: initializeSettings(): Successfully initialized settings'
          );

          resolve(true);
        })
        .catch(error => {
          console.error(
            'AuthProvider: initializeSettings(): Unable to initialize settings: ' +
              error
          );
          reject(error);
        });
    });
  }

  loginEmail(email: string, password: string): Promise<any> {
    this.mixpanel
      .track('login_email')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    return this.afAuth.auth
      .signInWithEmailAndPassword(email, password)
      .then(user => {
        let userCollectionRef = this.afs.collection<String>('Users');
        let userDoc = userCollectionRef.doc(this.afAuth.auth.currentUser.uid);

        // FIXME: Firestore { merge: true } doesn't work so we must check if the document
        //        exists before updating/creating

        const unsub = userDoc.ref.onSnapshot(doc => {
          if (doc.exists) {
            userDoc.update({
              signin: 'Email'
            });
          } else {
            userDoc.set({
              signin: 'Email'
            });
          }

          unsub();
        });

        this.mixpanel
          .track('login_email_success', {
            uid: this.afAuth.auth.currentUser.uid
          })
          .then(() => {})
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        // .catch(err => {
        //     console.error('Unable to add user record for uid ' + user.uid);
        //     console.error(JSON.stringify(err));
        //   });
      });
  }

  loginAnonymous(): Promise<any> {
    return firebase
      .auth()
      .signInAnonymously()
      .then(userCredential => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef
          .doc(userCredential.user.uid)
          .set({
            signin: 'Anonymous'
          })
          .catch(err => {
            console.error(
              'Unable to add user record for uid ' + userCredential.user.uid
            );
            console.error(JSON.stringify(err));
          });
      });
  }

  loginFacebook(): Promise<any> {
    this.mixpanel
      .track('login_facebook')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    return this.fb
      .login(['email'])
      .then(result => {
        const fbCredential = firebase.auth.FacebookAuthProvider.credential(
          result.authResponse.accessToken
        );

        console.log(fbCredential);

        return firebase
          .auth()
          .signInAndRetrieveDataWithCredential(fbCredential)
          .then(async signInResult => {
            this.mixpanel
              .track('login_facebook_success', {
                uid: this.afAuth.auth.currentUser.uid
              })
              .then(() => {})
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            let userCollectionRef = this.afs.collection<String>('Users');
            let userDoc = userCollectionRef.doc(
              this.afAuth.auth.currentUser.uid
            );

            if (signInResult.additionalUserInfo.isNewUser) {
              this.newUser = true;

              this.mixpanel
                .alias(this.afAuth.auth.currentUser.uid)
                .then(() => {})
                .catch(e => {
                  console.error('Mixpanel Error (alias)', e);
                });

              this.mixpanel
                .track('login_facebook_new_user', {
                  uid: this.afAuth.auth.currentUser.uid
                })
                .then(() => {})
                .catch(e => {
                  console.error('Mixpanel Error', e);
                });

              console.info('New User login - initializing settings');
              await this.initializeSettings(
                signInResult.user,
                'Facebook',
                signInResult.user.displayName
              );
            }
          });
      })
      .catch(e => {
        console.error(e);
      });
  }

  // loginGoogle(): Promise<any> {
  //   this.mixpanel
  //     .track('login_google')
  //     .then(() => {})
  //     .catch(e => {
  //       console.error('Mixpanel Error', e);
  //     });

  //   return this.gplus
  //     .login({
  //       webClientId:
  //         '543452999987-170hgpcfh777sukc4ntdvcan9bv3sdlt.apps.googleusercontent.com',
  //       offline: true
  //     })
  //     .then(res => {
  //       const googleCredential = firebase.auth.GoogleAuthProvider.credential(
  //         res.idToken
  //       );

  //       return firebase
  //         .auth()
  //         .signInAndRetrieveDataWithCredential(googleCredential)
  //         .then(async signInResult => {
  //           this.mixpanel
  //             .track('login_google_success', {
  //               uid: this.afAuth.auth.currentUser.uid
  //             })
  //             .then(() => {})
  //             .catch(e => {
  //               console.error('Mixpanel Error', e);
  //             });

  //           let userCollectionRef = this.afs.collection<String>('Users');
  //           let userDoc = userCollectionRef.doc(
  //             this.afAuth.auth.currentUser.uid
  //           );

  //           if (signInResult.additionalUserInfo.isNewUser) {
  //             this.newUser = true;

  //             this.mixpanel
  //               .alias(this.afAuth.auth.currentUser.uid)
  //               .then(() => {})
  //               .catch(e => {
  //                 console.error('Mixpanel Error (alias)', e);
  //               });

  //             this.mixpanel
  //               .track('login_google_new_user', {
  //                 uid: this.afAuth.auth.currentUser.uid
  //               })
  //               .then(() => {})
  //               .catch(e => {
  //                 console.error('Mixpanel Error', e);
  //               });

  //             console.info('New User login - initializing settings');
  //             await this.initializeSettings(
  //               signInResult.user,
  //               'Google',
  //               signInResult.user.displayName
  //             );
  //           }
  //         })
  //         .catch(e => {
  //           console.error(
  //             'loginGoogle(): signInWithCredential: ' + JSON.stringify(e)
  //           );
  //         });
  //     })
  //     .catch(e => {
  //       console.error('loginGoogle(): gplus.login: ' + JSON.stringify(e));
  //     });
  // }

  loginPhoneNumber(credential): Promise<any> {
    return firebase
      .auth()
      .signInWithCredential(credential)
      .then(signInResult => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef.doc(this.afAuth.auth.currentUser.uid).update({
          signin: 'Phone Number'
        });
      });
  }

  // Sign up a new user and add a new entry into the Users collection
  signupUser(name: string, email: string, password: string): Promise<any> {
    this.mixpanel
      .track('signup_email')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    return this.afAuth.auth
      .createUserAndRetrieveDataWithEmailAndPassword(email, password)
      .then(async userCredential => {
        this.mixpanel
          .track('signup_success', { uid: this.afAuth.auth.currentUser.uid })
          .then(() => {})
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        var userCollectionRef = this.afs.collection<String>('Users');

        console.info(JSON.stringify(userCredential.additionalUserInfo));

        if (userCredential.additionalUserInfo.isNewUser === true) {
          this.newUser = true;

          this.mixpanel
            .alias(this.afAuth.auth.currentUser.uid)
            .then(() => {})
            .catch(e => {
              console.error('Mixpanel Error (alias)', e);
            });

          console.info('New User login - initializing settings');

          await this.initializeSettings(userCredential.user, 'Email', name);
        }
      })
      .catch(e => {
        console.error('signupUser: ' + JSON.stringify(e));
        return new Promise((resolve, reject) => {
          reject(e);
        });
      });
  }

  resetPassword(email: string): Promise<void> {
    this.mixpanel
      .track('send_reset_password')
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    return this.afAuth.auth.sendPasswordResetEmail(email);
  }

  logoutUser(): Promise<void> {
    this.mixpanel
      .track('logout_user', { uid: this.afAuth.auth.currentUser.uid })
      .then(() => {})
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    return this.afAuth.auth.signOut();
  }

  sendLoginCode(window, phoneNumber) {
    // const appVerifier = window.recaptchaVerifier;
    // const num = phoneNumber;
    // var provider = new firebase.auth.PhoneAuthProvider();

    window.FirebasePlugin.getVerificationID(
      phoneNumber,
      id => {
        console.log('verificationID: ' + id);
        this.verificationId = id;
      },
      error => {
        console.log('error: ' + error);
      }
    );
    // provider
    //   .verifyPhoneNumber(phoneNumber, appVerifier)
    //   .then(verificationId => {
    //     console.log('Received Verification ID: ' + verificationId);

    //     this.verificationId = verificationId;
    //   })
    //   .catch(error => {
    //     console.error('sendLoginCode: ' + error);
    //   });
  }

  verifyLoginCode(window, verificationCode) {
    var phoneCredential = firebase.auth.PhoneAuthProvider.credential(
      this.verificationId,
      verificationCode
    );

    this.loginPhoneNumber(phoneCredential);
  }

  ngOnDestroy() {
    this.stop();
  }
}
