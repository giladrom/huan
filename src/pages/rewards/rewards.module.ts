import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { RewardsPage } from './rewards';
import { IonicImageLoader } from 'ionic-image-loader';
import { ProgressBarModule } from 'angular-progress-bar';

@NgModule({
  declarations: [
    RewardsPage,
  ],
  imports: [
    IonicPageModule.forChild(RewardsPage),
    IonicImageLoader,
    ProgressBarModule
  ],
})
export class RewardsPageModule {}
