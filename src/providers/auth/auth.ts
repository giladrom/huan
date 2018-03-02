import { Injectable, OnInit } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';

@Injectable()
export class AuthProvider {
  constructor(public afAuth: AngularFireAuth,
    private afs: AngularFirestore) {

  }

  loginUser(email: string, password: string): Promise<any> {
    return this.afAuth.auth.signInWithEmailAndPassword(email, password);
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