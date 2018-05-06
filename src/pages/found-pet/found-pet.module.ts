import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { FoundPetPage } from './found-pet';

@NgModule({
  declarations: [
    FoundPetPage,
  ],
  imports: [
    IonicPageModule.forChild(FoundPetPage),
  ],
})
export class FoundPetPageModule {}
