import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { QRScannerPage } from './qrscanner';

@NgModule({
  declarations: [QRScannerPage],
  imports: [IonicPageModule.forChild(QRScannerPage)]
})
export class QRScannerPageModule {}
