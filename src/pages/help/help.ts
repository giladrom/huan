import { Component } from "@angular/core";
import { IonicPage, NavController, NavParams } from "ionic-angular";
import { Mixpanel } from "@ionic-native/mixpanel";
import { InAppBrowser } from "@ionic-native/in-app-browser";

@IonicPage()
@Component({
  selector: "page-help",
  templateUrl: "help.html"
})
export class HelpPage {
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private mixpanel: Mixpanel,
    private iab: InAppBrowser
  ) {}

  ionViewDidLoad() {
    console.log("ionViewDidLoad HelpPage");
  }

  showContact() {
    this.mixpanel
      .track("show_contact_page")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.navCtrl.push("SupportPage");
  }

  showFAQ() {
    this.mixpanel
      .track("show_faq")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create(
      "https://huan.zendesk.com/hc/en-us/categories/360001879073-Frequently-Asked-Questions",
      "_system"
    );
  }

  showFeedback() {
    this.mixpanel
      .track("show_feedback")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create("https://airtable.com/shrMXeVunCDsE0yND", "_system");
  }

  showHuanBusinessPack() {
    this.mixpanel
      .track("show_business_pack_information")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create(
      "https://huan.zendesk.com/hc/en-us/categories/360001898694-Huan-Business-Pack-",
      "_system"
    );
  }

  showRescueInformation() {
    this.mixpanel
      .track("show_rescue_information")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create(
      "https://huan.zendesk.com/hc/en-us/categories/360001887673-Rescues",
      "_system"
    );
  }

  showBlog() {
    this.mixpanel
      .track("show_rescue_information")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create("https://gethuan.com/blog/", "_system");
  }

  showHowCanIHelp() {
    this.mixpanel
      .track("show_how_can_i_help")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.iab.create(
      "https://huan.zendesk.com/hc/en-us/articles/360024088253",
      "_system"
    );
  }
}
