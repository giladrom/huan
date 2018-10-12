import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { EditPage } from './edit';
import { IonicImageLoader } from 'ionic-image-loader';
import { SelectDropDownModule } from 'ngx-select-dropdown';

@NgModule({
  declarations: [EditPage],
  imports: [
    IonicPageModule.forChild(EditPage),
    IonicImageLoader,
    SelectDropDownModule
  ]
})
export class EditPageModule {}
