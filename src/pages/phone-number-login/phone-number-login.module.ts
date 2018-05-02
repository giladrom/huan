import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { PhoneNumberLoginPage } from './phone-number-login';

@NgModule({
  declarations: [
    PhoneNumberLoginPage,
  ],
  imports: [
    IonicPageModule.forChild(PhoneNumberLoginPage),
  ],
})
export class PhoneNumberLoginPageModule {}
