import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ListPage } from './list';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [ListPage],
  imports: [
    IonicPageModule.forChild(ListPage), 
    IonicImageLoader
  ]
})
export class ListPageModule {}
