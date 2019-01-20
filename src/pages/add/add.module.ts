import { NgModule } from '@angular/core';
import { IonicPageModule, Select } from 'ionic-angular';
import { AddPage } from './add';
import { IonicImageLoader } from 'ionic-image-loader';
import { SelectDropDownModule } from 'ngx-select-dropdown';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [AddPage],
  imports: [
    IonicPageModule.forChild(AddPage),
    IonicImageLoader,
    SelectDropDownModule,
    NgSelectModule
  ]
})
export class AddPageModule {}
