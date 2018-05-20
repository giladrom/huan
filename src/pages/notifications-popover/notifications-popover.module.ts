import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { NotificationsPopoverPage } from './notifications-popover';

@NgModule({
  declarations: [
    NotificationsPopoverPage,
  ],
  imports: [
    IonicPageModule.forChild(NotificationsPopoverPage),
  ],
})
export class NotificationsPopoverPageModule {}
