import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShowPage } from './show';
import { GoogleMap, GoogleMaps } from '@ionic-native/google-maps';

@NgModule({
  declarations: [
    ShowPage
  ],
  imports: [
    IonicPageModule.forChild(ShowPage),
  ],
})
export class ShowPageModule {}
