import { Component, ViewChild } from "@angular/core";
import { IonicPage, NavController, NavParams, Nav } from "ionic-angular";
import { BleProvider } from "../../providers/ble/ble";
import { InitProvider } from "../../providers/init/init";

@IonicPage()
@Component({
  selector: "page-permissions",
  templateUrl: "permissions.html"
})
export class PermissionsPage {
  private location = false;
  private notifications = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private ble: BleProvider,
    private init: InitProvider
  ) {}

  ionViewDidLoad() {
    console.log("ionViewDidLoad PermissionsPage");
  }

  askLocationPermissions() {
    this.ble.requestPermission();
    this.location = true;
    document.getElementById("location-button").style.color = "white";
    document.getElementById("location-button").style.background =
      "linear-gradient(to top, #0ba360 0%, #3cba92 100%)";
  }

  askNotificationPermissions() {
    (window as any).FirebasePlugin.grantPermission(function(hasPermission) {
      console.log("Permission was " + (hasPermission ? "granted" : "denied"));
    });

    this.notifications = true;
    document.getElementById("notification-button").style.color = "white";
    document.getElementById("notification-button").style.background =
      "linear-gradient(to top, #0ba360 0%, #3cba92 100%)";
  }

  getStarted() {
    this.init.initializeApp();
    this.navCtrl.setRoot("TabsPage");
  }
}
