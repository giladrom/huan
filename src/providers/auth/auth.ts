
import {takeUntil, sample} from 'rxjs/operators';
import { Injectable, OnDestroy } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import firebase from 'firebase/app';
import { Facebook } from '@ionic-native/facebook';
import { normalizeURL, Platform } from 'ionic-angular';
import { ReplaySubject ,  Subject ,  BehaviorSubject ,  Subscription, SubscriptionLike as ISubscription } from 'rxjs';
import { GooglePlus } from '@ionic-native/google-plus';


import { NativeGeocoder } from '@ionic-native/native-geocoder';

export interface UserAccount {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  address?: string;
}

@Injectable()
export class AuthProvider implements OnDestroy {
  private destroyed$: ReplaySubject<boolean>;
  private info$: BehaviorSubject<any> = new BehaviorSubject(null);
  private verificationId;
  private accountSubscription: Subscription = new Subscription();
  private authSubscription: Subscription = new Subscription();

  private auth$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private control_auth$: BehaviorSubject<boolean> = new BehaviorSubject<
    boolean
  >(false);

  constructor(
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private fb: Facebook,
    private gplus: GooglePlus,
    private platform: Platform,
    private geolocation: NativeGeocoder
  ) {}

  init() {
    console.log('AuthProvider: Initializing...');

    this.destroyed$ = new ReplaySubject(1);
    this.auth$ = new BehaviorSubject<any>(null);

    this.platform.ready().then(() => {
      const subscription = this.afAuth.auth.onAuthStateChanged(
        user => {
          if (user) {
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

  stop() {
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
      this.auth$.pipe(
        takeUntil(sub),
        sample(this.control_auth$),)
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

  getUserInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sub = new Subject();

      let subscription = this.auth$.pipe(
        takeUntil(sub),
        sample(this.control_auth$),)
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
            .update({ account: account });

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
              .ref.onSnapshot(doc => {
                unsubscribe();

                if (doc.exists && doc.data().account) {
                  resolve(doc.data().account);
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
              .valueChanges().pipe(
              takeUntil(this.destroyed$))
              .subscribe(doc => {
                console.log('*** doc: ' + JSON.stringify(doc));

                if (doc !== null) {
                  if (doc['account'] !== undefined) {
                    // Update DB with initial invite allocation
                    if (doc['account'].invites === undefined) {
                      console.warn('### Initializing invites');
                      this.afs
                        .collection('Users')
                        .doc(user.uid)
                        .update({ 'account.invites': 5 })
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

                    // Update DB with home address coordinates
                    this.geolocation
                      .forwardGeocode(doc['account'].address)
                      .then(res => {
                        console.log(
                          '### Resolved home address: ' + JSON.stringify(res)
                        );

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

                    console.log(
                      'getAccountInfo: Pushing ' +
                        JSON.stringify(doc['account'])
                    );
                    this.info$.next(doc['account']);
                    resolve(this.info$);
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

  updateInviteCount(invite: number) {
    invite = invite - 1;

    this.getUserInfo().then(user => {
      this.afs
        .collection('Users')
        .doc(user.uid)
        .update({ 'account.invites': invite })
        .then(() => {
          console.log('### Invites remaining: ' + invite);
        })
        .catch(e => {
          console.error(
            '### Unable to update invite count: ' + JSON.stringify(e)
          );
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

  // getDisplayAvatar(): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     this.afAuth.authState.subscribe(
  //       user => {
  //         if (user) {
  //           if (!user.isAnonymous && this.afAuth.auth.currentUser.photoURL) {
  //             resolve(this.afAuth.auth.currentUser.photoURL);
  //           } else {
  //             resolve(normalizeURL('assets/imgs/anonymous2.png'));
  //           }
  //         } else {
  //           reject('getDisplayAvatar: User is not currently logged in.');
  //         }
  //       },
  //       err => {
  //         reject('Unable to get auth state: ' + err);
  //       }
  //     );
  //   });
  // }

  // getDisplayName(): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     var unsubscribe = this.afAuth.authState.subscribe(
  //       user => {
  //         if (user) {
  //           if (!user.isAnonymous && this.afAuth.auth.currentUser.displayName) {
  //             unsubscribe.unsubscribe();

  //             resolve(this.afAuth.auth.currentUser.displayName);
  //           } else {
  //             unsubscribe.unsubscribe();

  //             resolve('Hello!');
  //           }
  //         } else {
  //           unsubscribe.unsubscribe();

  //           reject('getDisplayName: User is not currently logged in.');
  //         }
  //       },
  //       err => {
  //         unsubscribe.unsubscribe();

  //         reject('Unable to get auth state: ' + err);
  //       }
  //     );
  //   });
  // }

  loginEmail(email: string, password: string): Promise<any> {
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
            console.error('Unable to add user record for uid ' + userCredential.user.uid);
            console.error(JSON.stringify(err));
          });
      });
  }

  loginFacebook(): Promise<any> {
    return this.fb.login(['email']).then(result => {
      const fbCredential = firebase.auth.FacebookAuthProvider.credential(
        result.authResponse.accessToken
      );

      return firebase
        .auth()
        .signInWithCredential(fbCredential)
        .then(signInResult => {
          let userCollectionRef = this.afs.collection<String>('Users');
          let userDoc = userCollectionRef.doc(this.afAuth.auth.currentUser.uid);

          // FIXME: Firestore { merge: true } doesn't work so we must check if the document
          //        exists before updating/creating

          const unsub = userDoc.ref.onSnapshot(doc => {
            if (doc.exists) {
              userDoc.update({
                signin: 'Facebook'
              });
            } else {
              userDoc.set({
                signin: 'Facebook'
              });
            }

            unsub();
          });
        });
    });
  }

  loginGoogle(): Promise<any> {
    return this.gplus
      .login({
        webClientId:
          '543452999987-170hgpcfh777sukc4ntdvcan9bv3sdlt.apps.googleusercontent.com',
        offline: true
      })
      .then(res => {
        const googleCredential = firebase.auth.GoogleAuthProvider.credential(
          res.idToken
        );

        return firebase
          .auth()
          .signInWithCredential(googleCredential)
          .then(signInResult => {
            let userCollectionRef = this.afs.collection<String>('Users');
            let userDoc = userCollectionRef.doc(
              this.afAuth.auth.currentUser.uid
            );

            // FIXME: Firestore { merge: true } doesn't work so we must check if the document
            //        exists before updating/creating

            const unsub = userDoc.ref.onSnapshot(doc => {
              if (doc.exists) {
                userDoc.update({
                  signin: 'Google'
                });
              } else {
                userDoc.set({
                  signin: 'Google'
                });
              }

              unsub();
            });
          });
      });
  }

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
  signupUser(email: string, password: string): Promise<any> {
    return this.afAuth.auth
      .createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef.doc(userCredential.user.uid).set({
          signin: 'Email'
        });
      });
  }

  resetPassword(email: string): Promise<void> {
    return this.afAuth.auth.sendPasswordResetEmail(email);
  }

  logoutUser(): Promise<void> {
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
