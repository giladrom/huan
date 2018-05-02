import { Injectable, OnInit } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import firebase from 'firebase/app';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { normalizeURL } from 'ionic-angular';

@Injectable()
export class AuthProvider {
  private verificationId;

  constructor(
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private fb: Facebook
  ) {}

  getDisplayAvatar(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afAuth.authState.subscribe(
        user => {
          if (user) {
            if (!user.isAnonymous && this.afAuth.auth.currentUser.photoURL) {
              resolve(this.afAuth.auth.currentUser.photoURL);
            } else {
              resolve(normalizeURL('assets/imgs/anonymous2.png'));
            }
          } else {
            reject('getDisplayAvatar: User is not currently logged in.');
          }
        },
        err => {
          reject('Unable to get auth state: ' + err);
        }
      );
    });
  }

  getDisplayName(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.afAuth.authState.subscribe(
        user => {
          if (user) {
            if (!user.isAnonymous && this.afAuth.auth.currentUser.displayName) {
              resolve(this.afAuth.auth.currentUser.displayName);
            } else {
              resolve('Hello!');
            }
          } else {
            reject('getDisplayName: User is not currently logged in.');
          }
        },
        err => {
          reject('Unable to get auth state: ' + err);
        }
      );
    });
  }

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
          .update({
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
    const appVerifier = window.recaptchaVerifier;

    const num = phoneNumber;

    var provider = new firebase.auth.PhoneAuthProvider();

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
}
