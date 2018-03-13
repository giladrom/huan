import { Injectable, OnInit } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import firebase from 'firebase/app';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';

@Injectable()
export class AuthProvider {
  constructor(public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private fb: Facebook) {

  }

  loginUser(email: string, password: string): Promise<any> {
    return this.afAuth.auth.signInWithEmailAndPassword(email, password);
  }

  loginAnonymous(): Promise<any> {
    return firebase.auth().signInAnonymously().then((user) => {
        var userCollectionRef = this.afs.collection<String>('Users');

        
        userCollectionRef
          .doc(user.uid)
          .set(
            {
              signin: "Anonymous",
            }
          ).catch(err => {
            console.error("Unable to add user record for uid " + user.uid);
            console.error(JSON.stringify(err));
          });
      })
  }

  loginFacebook(): Promise<any> {
    return this.fb.login(['email']).then((result) => {
      const fbCredential = firebase.auth.FacebookAuthProvider.credential(result.authResponse.accessToken);

      return firebase.auth().signInWithCredential(fbCredential).then((signInResult) => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef
          .doc(this.afAuth.auth.currentUser.uid)
          .set(
            {
              signin: "Facebook",
            }
          );
      })
    })
  }

  // Sign up a new user and add a new entry into the Users collection
  signupUser(email: string, password: string): Promise<any> {
    return this.afAuth
      .auth
      .createUserWithEmailAndPassword(email, password).then((user) => {
        var userCollectionRef = this.afs.collection<String>('Users');

        userCollectionRef
          .doc(user.uid)
          .set(
            {
              tags: ""
            }
          );

      });
  }

  resetPassword(email: string): Promise<void> {
    return this.afAuth.auth.sendPasswordResetEmail(email);
  }

  logoutUser(): Promise<void> {
    return this.afAuth.auth.signOut();
  }
}