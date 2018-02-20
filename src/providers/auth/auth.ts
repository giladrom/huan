import {Injectable, OnInit} from '@angular/core';
import { AngularFireAuth } from 'angularFire2/auth';

@Injectable()
export class AuthProvider  {
  constructor(private afAuth: AngularFireAuth) {

  }

  loginUser(email: string, password: string): Promise<any> {
    return this.afAuth.auth.signInWithEmailAndPassword(email, password);
  }

  signupUser(email: string, password: string): Promise<any> {
    return this.afAuth
    .auth
    .createUserWithEmailAndPassword(email, password);
  }

  resetPassword(email: string): Promise<void> {
    return this.afAuth.auth.sendPasswordResetEmail(email);
  }

  logoutUser(): Promise<void> {
    return this.afAuth.auth.signOut();
  }
}