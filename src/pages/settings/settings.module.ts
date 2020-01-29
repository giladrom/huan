import { NgModule } from "@angular/core";
import { IonicPageModule } from "ionic-angular";
import { SettingsPage } from "./settings";
import { IonicSelectableModule } from "ionic-selectable";

@NgModule({
  declarations: [SettingsPage],
  imports: [IonicPageModule.forChild(SettingsPage), IonicSelectableModule]
})
export class SettingsPageModule {}
