import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { EditPage } from './edit';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [EditPage],
  imports: [IonicPageModule.forChild(EditPage), IonicImageLoader]
})
export class EditPageModule {}
