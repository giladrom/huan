import { NgModule } from '@angular/core';
import { IonicPageModule, Select } from 'ionic-angular';
import { AddPage } from './add';
import { IonicImageLoader } from 'ionic-image-loader';
import { SelectDropDownModule } from 'ngx-select-dropdown';

@NgModule({
  declarations: [AddPage],
  imports: [
    IonicPageModule.forChild(AddPage),
    IonicImageLoader,
    SelectDropDownModule
  ]
})
export class AddPageModule {}
