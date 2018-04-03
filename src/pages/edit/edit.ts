import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ActionSheetController, AlertController, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import { Tag } from '../../providers/tag/tag';
import { UtilsProvider } from '../../providers/utils/utils';
import { AngularFirestore } from 'angularfire2/firestore';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ImageProvider } from '../../providers/image/image';
import { normalizeURL } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-edit',
  templateUrl: 'edit.html',
})
export class EditPage {
  private tagForm: FormGroup;

  private tag: Tag;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    private platform: Platform,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    private utils: UtilsProvider,
    public actionSheetCtrl: ActionSheetController,
    private formBuilder: FormBuilder,
    private pictureUtils: ImageProvider) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      'name': ['', Validators.required],
      'breed': ['', Validators.required],
      'color': ['', Validators.required],
      'gender': ['', Validators.required],
      'weight': ['', Validators.required],
      'size': ['', Validators.required],
      'character': ['', Validators.required],
      'remarks': ['', Validators.required],
    });

    this.tag = {
      name: '',
      breed: '',
      color: '',
      gender: '',
      remarks: '',
      weight: '',
      size: '',
      tagId: '',
      location: '',
      img: '',
      lastseen: '',
      active: true,
      lost: false,
      uid: '',
    }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad EditPage');
    this.afs.collection<Tag>('Tags').doc(this.navParams.data).ref.get().then((data) => {
      this.tag = <Tag>data.data();
    });

  }

  save() {
    var imgUrl = this.pictureUtils.uploadPhoto().then((data) => {
      console.log(data.toString());
      this.tag.img = data.toString();
    });

    this.afs.collection<Tag>('Tags').doc(this.navParams.data).update(this.tag);
    this.navCtrl.pop();
  }

  changePicture() {
    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      buttons: [
        {
          text: 'Take a picture',
          icon: 'camera',
          handler: () => {
            this.pictureUtils.getPhoto(true).then(photoUrl => {
              this.tag.img = normalizeURL(photoUrl.toString());
            });
          }
        }, {
          text: 'From Gallery',
          icon: 'images',
          handler: () => {
            this.pictureUtils.getPhoto(false).then(photoUrl => {
              this.tag.img = normalizeURL(photoUrl.toString());
            });
          }
        }
      ]
    });

    actionSheet.present();
  }
}
