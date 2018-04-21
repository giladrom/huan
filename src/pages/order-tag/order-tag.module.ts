import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { OrderTagPage } from './order-tag';

@NgModule({
  declarations: [
    OrderTagPage,
  ],
  imports: [
    IonicPageModule.forChild(OrderTagPage),
  ],
})
export class OrderTagPageModule {}
