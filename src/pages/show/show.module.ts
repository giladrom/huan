import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ShowPage } from './show';
// import { GoogleMap, GoogleMaps } from '@ionic-native/google-maps';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [ShowPage],
  imports: [IonicPageModule.forChild(ShowPage), IonicImageLoader]
})
export class ShowPageModule {}
