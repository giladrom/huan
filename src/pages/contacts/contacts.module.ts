import { NgModule } from "@angular/core";
import { IonicPageModule } from "ionic-angular";
import { ContactsPage } from "./contacts";
import { IonicSelectableModule } from "ionic-selectable";

@NgModule({
  declarations: [ContactsPage],
  imports: [IonicPageModule.forChild(ContactsPage), IonicSelectableModule]
})
export class ContactsPageModule {}
