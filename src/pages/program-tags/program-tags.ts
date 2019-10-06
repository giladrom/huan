import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { BleProvider } from '../../providers/ble/ble';
import { UtilsProvider } from '../../providers/utils/utils';
import { Subject, Subscription } from 'rxjs';
import { distinct, first } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';

import firebase from 'firebase';


@IonicPage()
@Component({
  selector: 'page-program-tags',
  templateUrl: 'program-tags.html',
})
export class ProgramTagsPage {
  private scanning = false;
  private sub = new Subscription();

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private BLE: BleProvider,
    private utilsProvider: UtilsProvider,
    private afs: AngularFirestore,
    ) {
  }

  toggleScan() {
    this.scanning = !this.scanning;

    var ids = [];

    if (this.scanning) {
      this.BLE.startScan();
      this.BLE.getProgrammableTags().pipe(
        distinct(),
        first()
      ).subscribe(tag => {

        // if (ids.findIndex(value => {
        //   return value.id === tag.id;
        // }) == -1) {
        //   ids.push(tag);
        // } else {
          console.log("Tag", tag.id, "was seen more than once. Proceeding");

          this.BLE.stopScan();
          this.scanning = !this.scanning;

          this.utilsProvider.findRandomTagId().then(minor => {
            console.log("Programming new tag with ID", minor);

            this.BLE.programTag(tag.id, 1, minor).then(res => {
              console.log("Programmed tag with new ID");

              this.afs
              .collection('Tags')
              .doc(minor.toString())
              .set({
                'placeholder': true,
                'lost': false,
                'created': firebase.firestore.FieldValue.serverTimestamp()
              })
              .then(() => {
                console.log("Created placeholder");
              })
              .catch(e => {
                console.error(JSON.stringify(e));
              });

            }).catch(e => {
              console.error(e)
            })
          }).catch(e => {
            console.error(e)
          })
        // }


        console.log(JSON.stringify(ids));
      });
    } else {
      this.BLE.stopScan();
    }
  }


  ionViewDidLoad() {
    console.log('ionViewDidLoad ProgramTagsPage');
  }

  ionViewWillLeave() {
    this.BLE.stopScan();
  }
}
