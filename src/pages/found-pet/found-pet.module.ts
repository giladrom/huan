import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { FoundPetPage } from './found-pet';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [FoundPetPage],
  imports: [IonicPageModule.forChild(FoundPetPage), IonicImageLoader]
})
export class FoundPetPageModule {}
