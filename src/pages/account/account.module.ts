import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AccountPage } from './account';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [AccountPage],
  imports: [IonicPageModule.forChild(AccountPage), IonicImageLoader]
})
export class AccountPageModule {}
