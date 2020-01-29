import { Component, ViewChild } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController
} from "ionic-angular";
import {
  Contacts,
  Contact,
  ContactField,
  ContactName
} from "@ionic-native/contacts";
import { Mixpanel } from "@ionic-native/mixpanel";
import { IonicSelectableComponent } from "ionic-selectable";

class EmergencyContact {
  public phoneNumber: string;
  public displayName: string;
}

@IonicPage()
@Component({
  selector: "page-contacts",
  templateUrl: "contacts.html"
})
export class ContactsPage {
  emergencyContacts: EmergencyContact[];
  selectecContacts: EmergencyContact;

  @ViewChild("contactComponent") contactComponent: IonicSelectableComponent;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    private contacts: Contacts,
    private mixpanel: Mixpanel
  ) {
    this.emergencyContacts = [];

    this.contacts
      .find(["displayName", "phoneNumbers"], {
        multiple: true,
        hasPhoneNumber: true,
        desiredFields: ["displayName", "phoneNumbers"]
      })
      .then(contacts => {
        contacts.forEach(contact => {
          console.log(JSON.stringify(contact));

          if (contact.phoneNumbers) {
            this.emergencyContacts.push({
              phoneNumber: contact.phoneNumbers[0].value,
              displayName: contact.displayName
            });
          }
        });
      })
      .catch(e => {
        console.error(JSON.stringify(e));
      });
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad ContactsPage");
    this.contactComponent.close().catch(() => {});
    this.contactComponent.open();
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("contacts_page")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });
  }

  dismiss() {
    this.viewCtrl.dismiss().then(() => {
      console.log("Dismissed");
    });
  }

  contactsChange(event: { component: IonicSelectableComponent; value: any }) {
    console.log("contact:", event.value);
  }
}
