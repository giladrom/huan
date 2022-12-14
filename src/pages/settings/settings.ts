import { Component, OnDestroy, ViewChild } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  Platform,
  ModalController,
} from "ionic-angular";
import { SettingsProvider, Settings } from "../../providers/settings/settings";

import { BleProvider } from "../../providers/ble/ble";
import { Subscription } from "rxjs";
import { ENV } from "@app/env";
import { UtilsProvider } from "../../providers/utils/utils";
import { ContactsPage } from "../../pages/contacts/contacts";
import { IonicSelectableComponent } from "ionic-selectable";
import { Contacts } from "@ionic-native/contacts";
import { Mixpanel } from "@ionic-native/mixpanel";
import { InAppBrowser } from "@ionic-native/in-app-browser";

import * as lodash from "lodash";
import { TagProvider } from "../../providers/tag/tag";
import { AuthProvider, UserAccount } from "../../providers/auth/auth";

class EmergencyContact {
  public phoneNumber: string;
  public displayName: string;
}

@IonicPage()
@Component({
  selector: "page-settings",
  templateUrl: "settings.html",
})
export class SettingsPage implements OnDestroy {
  private config: Settings;
  private subscription: Subscription = new Subscription();
  private frequency_badge;
  private tag_warnings = 0;
  private account: UserAccount;
  devel: any;

  emergencyContacts: EmergencyContact[];
  selectedContacts: EmergencyContact[];

  @ViewChild("contactComponent") contactComponent: IonicSelectableComponent;

  private frequency = [
    {
      val: 10,
      text: "Dogs are OK",
    },
    {
      val: 5,
      text: "I love dogs!",
    },
    {
      val: 1,
      text: "NEVER LEAVE ME",
    },
  ];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private settingsProvider: SettingsProvider,
    private ble: BleProvider,
    private platform: Platform,
    private utilsProvider: UtilsProvider,
    private contacts: Contacts,
    private mixpanel: Mixpanel,
    private iab: InAppBrowser,
    private tagProvider: TagProvider,
    private authProvider: AuthProvider
  ) {
    this.emergencyContacts = [];
    this.selectedContacts = [];

    this.config = {
      regionNotifications: false,
      communityNotifications: true,
      communityNotificationString: "",
      tagNotifications: false,
      enableMonitoring: true,
      monitoringFrequency: 2,
      showWelcome: true,
      shareContactInfo: true,
      highAccuracyMode: false,
      sensor: false,
      petListMode: "grid",
      homeAloneMode: false,
      emergencyContacts: [],
      sendEmailAlerts: true,
      sendTextAlerts: true,
    };

    this.account = {
      phoneNumber: "",
    };

    this.platform.ready().then(() => {
      if (ENV.mode === "Development") {
        this.devel = true;
      }

      this.authProvider
        .getAccountInfo()
        .then((account) => {
          console.log("Account info: " + JSON.stringify(account));

          if (account !== undefined) {
            this.account = account;
          }
        })
        .catch((error) => {
          console.error("Unable to get account info " + error);
        });

      const subscription = this.settingsProvider
        .getSettings()
        .subscribe((settings) => {
          if (settings) {
            if (!settings.emergencyContacts) {
              settings.emergencyContacts = [];
            }

            if (settings.sendEmailAlerts == null) {
              settings.sendEmailAlerts = true;
              settings.sendTextAlerts = true;

              this.settingsProvider.setEmailAlerts(true);
              this.settingsProvider.setTextAlerts(true);
            }

            this.config = <Settings>settings;
            console.log("Settings: " + JSON.stringify(this.config));

            if (!this.config.monitoringFrequency) {
              this.config.monitoringFrequency = 2;
              this.updateMonitoringFrequency(null);
            }

            if (this.config.enableMonitoring) {
              this.frequency_badge = this.frequency[
                this.config.monitoringFrequency - 1
              ].text;
            } else {
              this.frequency_badge = "Dogs suck";
            }
          }
        });

      this.subscription.add(subscription);

      this.tagProvider.getTagWarnings().subscribe((warnings) => {
        if (warnings > 0) {
          this.tag_warnings = warnings as number;
        } else {
          this.tag_warnings = 0;
        }
      });
    });
  }

  ionViewDidLoad() {
    console.log("ionViewDidLoad SettingsPage");
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("settings_page")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });
  }

  updateEmailAlerts() {
    this.settingsProvider.setEmailAlerts(this.config.sendEmailAlerts);
  }

  updateTextAlerts() {
    this.settingsProvider.setTextAlerts(this.config.sendTextAlerts);
  }

  updateRegionNotifications() {
    this.settingsProvider.setRegionNotifications(
      this.config.regionNotifications
    );

    if (this.config.regionNotifications) {
      this.config.highAccuracyMode = true;
      this.updateHighAccuracyMode();
    }
  }

  updateTagNotifications() {
    this.settingsProvider.setTagNotifications(this.config.tagNotifications);
  }

  updateCommunityNotifications() {
    this.settingsProvider.setCommunityNotifications(
      this.config.communityNotifications
    );
  }

  updateEnableMonitoring() {
    this.settingsProvider.setEnableMonitoring(this.config.enableMonitoring);

    if (this.config.enableMonitoring) {
      this.ble.enableMonitoring();
    } else {
      this.ble.disableMonitoring();
    }
  }

  updateEnableSensorMode() {
    this.settingsProvider.setEnableSensorMode(this.config.sensor);
  }

  updateMonitoringFrequency(ev) {
    console.log(this.config.monitoringFrequency);

    this.settingsProvider.setMonitoringFrequency(
      this.config.monitoringFrequency
    );
  }

  updateShareContactInfo() {
    this.settingsProvider.setShareContactInfo(this.config.shareContactInfo);
  }

  updateHighAccuracyMode() {
    this.settingsProvider
      .setHighAccuracyMode(this.config.highAccuracyMode)
      .then((r) => {
        if (this.platform.is("android")) {
          if (this.config.highAccuracyMode) {
            this.ble.enableForegroundService();
          } else {
            this.ble.disableForegroundService();
          }
        }
      })
      .catch((e) => {
        console.error("updateHighAccuracyMode", e);
      });
  }

  updateHomeAloneMode() {
    this.settingsProvider
      .setHomeAloneMode(this.config.homeAloneMode)
      .then(() => { })
      .catch((e) => {
        console.error(e);
      });

    if (this.config.homeAloneMode) {
      this.config.highAccuracyMode = true;
      this.updateHighAccuracyMode();
    }
  }

  ngOnDestroy() {
    // this.subscription.unsubscribe();
  }

  showTerms() {
    this.iab.create("https://www.gethuan.com/terms-and-conditions/", "_system");
  }

  showPrivacyPolicy() {
    this.iab.create("https://www.gethuan.com/privacy-policy/", "_system");
  }

  showTermsOfUse() {
    this.navCtrl.push("TermsOfUsePage");
  }

  openContactsModal() {
    this.mixpanel
      .track("select_emergency_contacts")
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.emergencyContacts = [];

    this.contacts
      .find(["displayName", "phoneNumbers"], {
        multiple: true,
        hasPhoneNumber: true,
        desiredFields: ["displayName", "phoneNumbers"],
      })
      .then((contacts) => {
        let uniqueContacts = lodash.uniqBy(contacts, "displayName");

        uniqueContacts.sort((a, b) => {
          if (a.displayName < b.displayName) {
            return -1;
          }

          if (a.displayName > b.displayName) {
            return 1;
          }

          return 0;
        });

        uniqueContacts.forEach((contact) => {
          try {
            if (
              contact.phoneNumbers &&
              contact.phoneNumbers[0].value.length > 0 &&
              contact.displayName.length > 0
            ) {
              this.emergencyContacts.push({
                phoneNumber: contact.phoneNumbers[0].value,
                displayName: contact.displayName,
              });
            }
          } catch (e) {
            console.error(e);
          }
        });

        this.contactComponent.open().catch((e) => {
          console.error(e);
        });
      })
      .catch((e) => {
        console.error(e);
      });

    // const modal = this.modalController.create(ContactsPage);
    // modal.present();
  }

  contactsChange(event: { component: IonicSelectableComponent; value: any }) {
    console.log("contact:", JSON.stringify(event.value));

    this.settingsProvider.setEmergencyContacts(event.value).catch((e) => {
      console.error(e);
    });
  }

  review() {
    this.utilsProvider.reviewApp();
  }
}
