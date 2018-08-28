import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AddPage } from './add';
import { IonicImageLoader } from 'ionic-image-loader';
import { SelectSearchableModule } from 'ionic-select-searchable';

@NgModule({
  declarations: [AddPage],
  imports: [
    IonicPageModule.forChild(AddPage),
    IonicImageLoader,
    SelectSearchableModule
  ]
})
export class AddPageModule {}
