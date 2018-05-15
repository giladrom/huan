import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AddPage } from './add';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [AddPage],
  imports: [IonicPageModule.forChild(AddPage), IonicImageLoader]
})
export class AddPageModule {}
