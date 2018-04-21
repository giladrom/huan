import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ConfirmSubscriptionPage } from './confirm-subscription';

@NgModule({
  declarations: [
    ConfirmSubscriptionPage,
  ],
  imports: [
    IonicPageModule.forChild(ConfirmSubscriptionPage),
  ],
})
export class ConfirmSubscriptionPageModule {}
