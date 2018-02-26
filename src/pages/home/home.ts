import { Component } from '@angular/core';
import { NavController, AlertController } from 'ionic-angular';

import { AngularFireModule } from 'angularfire2';
import { AngularFirestore, 
  AngularFirestoreCollection } from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import { AddPage } from '../add/add';
import { ShowPage } from '../show/show';

import { UtilsProvider } from '../../providers/utils/utils';


import firebase from 'firebase/app';
import 'firebase/storage';
import moment from 'moment';

import { Tag } from '../../providers/tag/tag';

import { AngularFireAuth } from 'angularfire2/auth';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {
  tagCollectionRef: AngularFirestoreCollection<Tag>;
  tag$: Observable<Tag[]>;

  public myPhotosRef: any;

  constructor(public navCtrl: NavController, 
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utils: UtilsProvider) {
    
    var uid = afAuth.auth.currentUser.uid;

    this.tagCollectionRef = this.afs.collection<Tag>(uid);
    this.tag$ = this.tagCollectionRef.valueChanges();

    this.tag$ = this.tagCollectionRef.snapshotChanges().map(actions => {
      return actions.map(action => {
        const data = action.payload.doc.data() as Tag;
        const id = action.payload.doc.id;
        return { id, ...data };
      });
    });
  }

  lastSeen(lastseen) {
    return this.utils.getLastSeen(lastseen);
  }


  addTag() {
    this.navCtrl.push(AddPage);
  }

  showTag(tagItem) {
    this.navCtrl.push(ShowPage, tagItem);
  }

  deleteTag(tagItem) {
    this.myPhotosRef = firebase.storage().ref('/Photos/');

    // Display a confirmation alert before deleting

    let confirm = this.alertCtrl.create({
      title: 'Delete ' + tagItem.name,
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Delete',
          handler: () => {
            // Need to have an exception handler here since trying to get a reference
            // to a nonexistent URL throws an error
            try {
              var ref = firebase.storage().refFromURL(tagItem.img);

              if (ref.fullPath.length > 0) {
                ref.delete().then(function () {
                  console.log("Removed " + tagItem.img);
                })
                  .catch(function (error) {
                    console.log("ERROR -> " + JSON.stringify(error));
                  });
              }
            } catch (e) {
              console.log("Unable to delete image for tag " + tagItem.id + " (" + tagItem.img + ")");
            }

            this.tagCollectionRef.doc(tagItem.id).delete().then(function () {
              console.log("Removed " + tagItem.id);
            }).catch(function(error) {
              console.log("ERROR -> " + JSON.stringify(error));                
            });
          }
        }
      ]
    });

    confirm.present();
  }

  markAsLost(tagItem){
    let confirm = this.alertCtrl.create({
      title: 'Mark ' + tagItem.name + ' as lost',
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Mark Lost!',
          handler: () => {
            console.log("Marking " + tagItem.name + " as lost!");
            this.tagCollectionRef.doc(tagItem.id).update({ lost: true });
          }
        }
      ]
    });

    confirm.present();
  }

  markAsFound(tagItem){
    let confirm = this.alertCtrl.create({
      title: 'Is ' + tagItem.name + ' found',
      message: 'Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Mark Found!',
          handler: () => {
            console.log("Marking " + tagItem.name + " as found!");
            this.tagCollectionRef.doc(tagItem.id).update({ lost: false });
          }
        }
      ]
    });

    confirm.present();
  }
}
