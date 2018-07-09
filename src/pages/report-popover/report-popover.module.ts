import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ReportPopoverPage } from './report-popover';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [ReportPopoverPage],
  imports: [IonicPageModule.forChild(ReportPopoverPage), IonicImageLoader]
})
export class ReportPopoverPageModule {}
