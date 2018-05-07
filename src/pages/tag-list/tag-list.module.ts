import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { TagListPage } from './tag-list';
// import { ChartModule } from 'angular2-chartjs';

@NgModule({
  declarations: [TagListPage],
  imports: [IonicPageModule.forChild(TagListPage)],
  schemas: [NO_ERRORS_SCHEMA]
})
export class TagListPageModule {}
