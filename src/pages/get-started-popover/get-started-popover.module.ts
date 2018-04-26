import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { GetStartedPopoverPage } from './get-started-popover';

@NgModule({
  declarations: [
    GetStartedPopoverPage,
  ],
  imports: [
    IonicPageModule.forChild(GetStartedPopoverPage),
  ],
})
export class GetStartedPopoverPageModule {}
