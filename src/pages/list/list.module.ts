import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ListPage } from './list';
import { IonicImageLoader } from 'ionic-image-loader';
import { ProgressBarModule } from 'angular-progress-bar';

@NgModule({
  declarations: [ListPage],
  imports: [
    IonicPageModule.forChild(ListPage),
    IonicImageLoader,
    ProgressBarModule
  ]
})
export class ListPageModule {}
