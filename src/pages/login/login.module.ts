import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { LoginPage } from './login';
import { AngularFireAuth } from 'angularFire2/auth';


@NgModule({
  declarations: [
    LoginPage,
  ],
  imports: [
    IonicPageModule.forChild(LoginPage),
    //AngularFireAuthModule
  ],
  providers: [
    AngularFireAuth
  ]
})
export class LoginPageModule {}
