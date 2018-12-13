import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { HomePage } from './home';
import { IonicImageLoader } from 'ionic-image-loader';
import { ProgressBarModule } from 'angular-progress-bar';

@NgModule({
  declarations: [HomePage],
  imports: [
    IonicPageModule.forChild(HomePage),
    IonicImageLoader,
    ProgressBarModule
  ]
})
export class HomePageModule {}
