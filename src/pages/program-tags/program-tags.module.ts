import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ProgramTagsPage } from './program-tags';

@NgModule({
  declarations: [
    ProgramTagsPage,
  ],
  imports: [
    IonicPageModule.forChild(ProgramTagsPage),
  ],
})
export class ProgramTagsPageModule {}
