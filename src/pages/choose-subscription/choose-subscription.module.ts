import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ChooseSubscriptionPage } from './choose-subscription';

@NgModule({
  declarations: [
    ChooseSubscriptionPage,
  ],
  imports: [
    IonicPageModule.forChild(ChooseSubscriptionPage),
  ],
})
export class ChooseSubscriptionPageModule {}
