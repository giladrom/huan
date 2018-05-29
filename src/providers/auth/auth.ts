import { Injectable, OnDestroy } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import firebase from 'firebase/app';
import { Facebook } from '@ionic-native/facebook';
import { normalizeURL, Platform } from 'ionic-angular';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription, ISubscription } from 'rxjs/Subscription';

export interface UserAccount {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  address?: string;
}

@Injectable()
export class AuthProvider implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private info$: Subject<any> = new Subject();
  private verificationId;
  private accountSubscription: Subscription = new Subscription();

  private userInfo: any = 0;
  private authSubscription: Subscription = new Subscription();

  constructor(
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private fb: Facebook,
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      const subscription = this.afAuth.auth.onAuthStateChanged(
        user => {
          if (user) {
            console.log('AuthProvider: Received user info for ' + user.uid);
            this.userInfo = user;
          }
        },
        err => {
          console.error('AuthProvider: Unable to retrieve user info: ' + err);
        }
      );

      this.authSubscription.add(subscription);
    });
  }

  getUserId(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.userInfo !== 0) {
        resolve(this.userInfo.uid);
      } else {
        setTimeout(() => {
          if (this.userInfo === 0) {
            reject('getUserId: User is not currently logged in.');
          } else {
            resolve(this.userInfo.uid);
          }
        }, 1500);

        // reject('getUserId: User is not currently logged in.');
      }
    });
  }

  getUserInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.userInfo !== 0) {
        resolve(this.userInfo);
      } else {
        setTimeout(() => {
          if (this.userInfo === 0) {
            reject('getUserInfo: User is not currently logged in.');
          } else {
            resolve(this.userInfo);
          }
        }, 1500);
      }
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
            const accountSubscription = this.afs
              .collection('Users')
              .doc(user.uid)
              .valueChanges()
              .takeUntil(this.destroyed$)
              .subscribe(doc => {
                if (doc['account'] !== undefined) {
                  console.log('Pushing ' + JSON.stringify(doc['account']));
                  this.info$.next(doc['account']);
                }
              });

            this.accountSubscription.add(accountSubscription);
            resolve(this.info$);
          }
        })
        .catch(error => {
          reject('getAccountInfo:' + error);
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
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef
          .doc(user.uid)
          .update({
            signin: 'Email'
          })
          .catch(err => {
            console.error('Unable to add user record for uid ' + user.uid);
            console.error(JSON.stringify(err));
          });
      });
  }

  loginAnonymous(): Promise<any> {
    return firebase
      .auth()
      .signInAnonymously()
      .then(user => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef
          .doc(user.uid)
          .set({
            signin: 'Anonymous'
          })
          .catch(err => {
            console.error('Unable to add user record for uid ' + user.uid);
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
          var userCollectionRef = this.afs.collection<String>('Users');

          userCollectionRef.doc(this.afAuth.auth.currentUser.uid).update({
            signin: 'Facebook'
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
      .then(user => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef.doc(user.uid).set({
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
    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.accountSubscription.unsubscribe();
    this.authSubscription.unsubscribe();
  }
}
