import { Component, OnDestroy } from "@angular/core";
import {
  IonicPage,
  NavController,
  NavParams,
  ActionSheetController,
  AlertController,
  Platform,
  LoadingController,
} from "ionic-angular";
import { Tag, TagProvider } from "../../providers/tag/tag";
import { AngularFirestore } from "@angular/fire/firestore";
import { FormGroup, Validators, FormBuilder } from "@angular/forms";
import { ImageProvider } from "../../providers/image/image";
import { MarkerProvider } from "../../providers/marker/marker";
import { UtilsProvider } from "../../providers/utils/utils";
import { AuthProvider } from "../../providers/auth/auth";

import * as firebase from "firebase/app";
import "firebase/firestore";

import { map } from "rxjs/operators";
import { ReplaySubject } from "rxjs";
import { Mixpanel } from "@ionic-native/mixpanel";
import { Toast } from "@ionic-native/toast";
import { BleProvider } from "../../providers/ble/ble";
import { SMS } from "@ionic-native/sms";
import moment from "moment";
import { Keyboard } from "@ionic-native/keyboard";
import { revokeObjectURL } from "blob-util";

@IonicPage()
@Component({
  selector: "page-edit",
  templateUrl: "edit.html",
})
export class EditPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  private win: any = window;

  private tagForm: FormGroup;

  private tag: Tag;
  private photoChanged: boolean;

  breedSelectOptions: any;
  furSelectOptions: any;
  genderSelectOptions: any;
  sizeSelectOptions: any;
  characterSelectOptions: any;
  breeds: Array<any>;
  colors: Array<any>;
  characters: Array<any>;
  owners: Array<any>;
  original_tagId: any;
  my_uid: any;
  private loader;

  dropDownConfig: any = {
    displayKey: "description",
    height: "300px",
    search: true,
    placeholder: "Select Breed",
    // limitTo: this.options.length,
    // customComparator:
  };

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    private afs: AngularFirestore,
    public actionSheetCtrl: ActionSheetController,
    private formBuilder: FormBuilder,
    private imageProvider: ImageProvider,
    private markerProvider: MarkerProvider,
    private utils: UtilsProvider,
    private tagProvider: TagProvider,
    private authProvider: AuthProvider,
    private mixpanel: Mixpanel,
    private toast: Toast,
    private ble: BleProvider,
    private sms: SMS,
    private loadingCtrl: LoadingController,
    private keyboard: Keyboard,
    private platform: Platform // Used by the template, do not remove
  ) {
    // Set up form validators

    this.tagForm = this.formBuilder.group({
      name: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(30),
          Validators.pattern("^[a-zA-Z0-9\\.\\s*]+$"),
        ],
      ],
      breed: [
        "",
        [
          // Validators.required,
          // Validators.minLength(1),
          // Validators.pattern('^[a-zA-Z\\/\\(\\)\\,*\\s*]+$')
        ],
      ],
      color: [
        "",
        [
          Validators.required,
          Validators.minLength(1),
          Validators.pattern("^[a-zA-Z\\,\\s*]+$"),
        ],
      ],
      gender: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern("^[a-zA-Z\\s*]+$"),
        ],
      ],
      weight: [
        "",
        [
          //Validators.required,
          Validators.minLength(1),
          Validators.maxLength(30),
        ],
      ],
      size: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern("^[a-zA-Z\\s*]+$"),
        ],
      ],
      character: [
        "",
        [
          //Validators.required,
          Validators.minLength(2),
          Validators.pattern("^[a-zA-Z\\s*]+$"),
        ],
      ],
      remarks: [
        "",
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(300),
          Validators.pattern(
            '^[a-zA-Z0-9\\.\\,\\-\\!\\(\\)\\[\\]\\"\\"\\s*]+$'
          ),
        ],
      ],
      high_risk: [],
      type: [],
      //remarks: ['']
    });

    this.breedSelectOptions = {
      title: "Breed",
      subTitle: "Select more than one for a mixed breed",
    };

    this.furSelectOptions = {
      title: "Fur color",
      // subTitle: 'Select more than one for a mixed breed'
    };

    this.genderSelectOptions = {
      title: "Gender",
    };

    this.sizeSelectOptions = {
      title: "Size",
    };

    this.characterSelectOptions = {
      title: "Character",
    };

    this.colors = this.tagProvider.getFurColors();

    this.characters = this.tagProvider.getCharacters();

    // Initialize the new tag info

    this.tag = {
      name: "",
      breed: "Mixed Dog breed",
      color: "Black",
      gender: "Male",
      remarks: "None",
      weight: "50",
      size: "Large",
      tagId: "",
      location: "",
      character: "Friendly",
      img: " ",
      lastseen: firebase.firestore.FieldValue.serverTimestamp(),
      lastseenBy: "",
      active: true,
      lost: false,
      uid: "",
      fcm_token: "",
      markedlost: "",
      markedfound: "",
      hw: {
        batt: -1,
      },
      tagattached: true,
      high_risk: false,
      type: "dog",
    };

    this.photoChanged = false;

    this.owners = new Array<any>();
    this.authProvider
      .getUserId()
      .then((_uid) => {
        this.my_uid = _uid;
      })
      .catch((e) => {
        console.error("Unable to get UID", e);
      });
  }

  ionViewWillLoad() {
    this.mixpanel
      .track("edit_page", { tag: this.navParams.data })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    console.log("ionViewDidLoad EditPage");

    this.afs
      .collection<Tag>("Tags")
      .doc(this.navParams.data)
      .snapshotChanges()
      .pipe(
        map((a) => {
          const data = a.payload.data({
            serverTimestamps: "previous",
          }) as Tag;
          const id = a.payload.id;
          return { id, ...data };
        })
      )
      .subscribe((tag) => {
        this.tag = <Tag>tag;

        if (tag.uid) {
          this.getOwners(tag.uid).then((owners) => {
            this.owners = owners;
          });
        }

        if (this.tag.type == "dog") {
          this.breeds = this.tagProvider.getDogBreeds();
        } else {
          this.breeds = this.tagProvider.getCatBreeds();
        }

        window.document.getElementById(
          "image"
        ).style.backgroundImage = `url(${this.tag.img})`;
      });
  }

  getOwnerInfo(uid): Promise<any> {
    return new Promise((resolve, reject) => {
      const unsub = this.afs
        .collection("Users")
        .doc(uid)
        .ref.onSnapshot((data) => {
          unsub();

          if (data.exists) {
            var obj = {
              uid: uid,
              owner: data.data().account.displayName,
            };

            resolve(obj);
          } else {
            reject(data.exists);
          }
        });
    });
  }

  getOwners(uids): Promise<any> {
    return new Promise((resolve, reject) => {
      let promises = uids.map((uid) => {
        return this.getOwnerInfo(uid).then((owner) => {
          return owner;
        });
      });

      Promise.all(promises)
        .then((r) => {
          resolve(r);
        })
        .catch((e) => {
          console.error(e);
          reject(e);
        });
    });
  }

  ionViewWillLeave() {
    // this.save();
  }

  ionViewDidEnter() {
    this.ble.disableMonitoring();
  }

  ionViewDidLeave() {
    this.ble.enableMonitoring();
  }

  trackByOwner(index: number, owner: any) {
    return index;
  }

  showRemoveOwnerConfirmDialog(owner, uid) {
    this.mixpanel
      .track("remove_owner", { uid: uid })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.authProvider.getUserId().then((_uid) => {
      // Display a different warning and pop back to the list page
      // if removing ourselves as an owner

      if (uid === _uid) {
        let alert = this.alertCtrl.create({
          title: `Warning`,
          message: `You are about to remove yourself as an owner. Are you sure?`,
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
              handler: () => {
                console.log("Cancel clicked");
              },
            },
            {
              text: "Remove",
              handler: () => {
                console.log("Remove clicked");

                this.mixpanel
                  .track("remove_self")
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                this.removeOwner(uid);
                this.navCtrl.pop();
              },
            },
          ],
        });

        alert.present();
      } else {
        this.utils.displayAlert(
          "Remove Owners",
          "You can not remove other owners."
        );

        // let alert = this.alertCtrl.create({
        //   title: `Remove owner`,
        //   message: `This will remove ${owner} as an owner. Are you sure?`,
        //   buttons: [
        //     {
        //       text: 'Cancel',
        //       role: 'cancel',
        //       handler: () => {
        //         console.log('Cancel clicked');
        //       }
        //     },
        //     {
        //       text: 'Remove',
        //       handler: () => {
        //         console.log('Remove clicked');

        //         this.mixpanel
        //           .track('remove_owner', { uid: uid })
        //           .then(() => {})
        //           .catch(e => {
        //             console.error('Mixpanel Error', e);
        //           });

        //         this.removeOwner(uid);
        //       }
        //     }
        //   ]
        // });

        // alert.present();
      }
    });
  }

  removeOwner(owner) {
    var item_to_delete = this.tag.uid.indexOf(owner);
    console.log(`Item to delete: ${item_to_delete}`);

    if (item_to_delete >= 0) {
      this.tag.uid.splice(item_to_delete, 1);

      var fcm_item_to_delete = this.tag.fcm_token.indexOf(
        this.tag.fcm_token.find((ownersObj) => ownersObj.uid === owner)
      );

      if (fcm_item_to_delete >= 0) {
        this.tag.fcm_token.splice(fcm_item_to_delete, 1);
      }

      this.writeTagData();
    }
  }

  deleteTag(tagId) {
    return new Promise((resolve, reject) => {
      this.afs
        .collection("Tags")
        .doc(tagId)
        .set({
          placeholder: true,
          lost: false,
          created: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          console.log("Created placeholder");

          this.markerProvider.deleteMarker(tagId).catch((e) => {
            console.error(JSON.stringify(e));
          });

          resolve(true);
        })
        .catch((e) => {
          console.error(JSON.stringify(e));
          reject(e);
        });
    });
  }

  writeTagData() {
    return new Promise<any>((resolve, reject) => {
      if (this.original_tagId) {
        this.afs
          .collection<Tag>("Tags")
          .doc(this.tag.tagId)
          .set(this.tag)
          .then(() => {
            this.mixpanel
              .track("added_tag", { tag: this.tag.tagId })
              .then(() => { })
              .catch((e) => {
                console.error("Mixpanel Error", e);
              });

            console.log("Successfully added tag with new Tag ID");
            console.log("Removing original document " + this.original_tagId);

            this.deleteTag(this.original_tagId)
              .then(() => {
                resolve(true);
              })
              .catch((e) => {
                console.error("deleteTag", e);
                reject(e);
              });
          })
          .catch((error) => {
            console.error("Unable to add tag: " + JSON.stringify(error));
            reject(error);
          });
      } else {
        console.log("Save");

        this.afs
          .collection<Tag>("Tags")
          .doc(this.navParams.data)
          .update(this.tag)
          .then(() => {
            resolve(true);
          })
          .catch((e) => {
            console.error("writeTagData", e);
            reject(e);
          });
      }
    });
  }

  getOwnersName(owner) {
    var unsubscribe = this.afs
      .collection("Users")
      .doc(owner)
      .ref.onSnapshot((doc) => {
        unsubscribe();

        return doc.data().account.displayName;
      });
  }

  save() {
    return new Promise<any>((resolve, reject) => {
      if (this.photoChanged === true) {
        this.showLoading();

        this.imageProvider
          .uploadPhoto()
          .then(async (data) => {
            console.log("Photo URL", data);

            this.tag.img = data.toString();

            // Delete existing marker
            console.log("Deleting previous marker");

            this.markerProvider.deleteMarker(this.tag.tagId).catch((e) => {
              console.error(JSON.stringify(e));
            });

            // Add new marker
            this.markerProvider
              .addPetMarker(this.tag, true)
              .then((marker) => {
                console.log("Successfully added new marker");
              })
              .catch((error) => {
                console.error("addMarker() error: " + error);
              });

            await this.writeTagData()
              .then(() => {
                resolve(true);
              })
              .catch((e) => {
                reject(e);
              });
          })
          .catch((e) => {
            this.dismissLoading();

            console.error("Could not upload photo: " + JSON.stringify(e));
            reject(e);
          });

        this.photoChanged = false;
      } else {
        this.writeTagData()
          .then(() => {
            resolve(true);
          })
          .catch((e) => {
            reject(e);
          });
      }
    });
  }

  changeTag() {
    this.mixpanel
      .track("change_tag", { tag: this.tag.tagId })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.replaceTag().then(() => {
      console.log("Replace tag OK");
    }).catch(e => { console.error('Replace tag', e) });
  }

  replaceTag() {
    return new Promise((resolve, reject) => {

      const prompt = this.alertCtrl.create({
        title: "Replace Tag",
        message:
          "Please enter the number as printed on your Huan tag, and make sure it is activated by pressing it for 5 seconds.",
        inputs: [
          {
            name: "number",
            placeholder: "00000",
            type: "number",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            handler: (data) => {
              console.log("Cancel clicked");
            },
          },
          {
            text: "Replace Tag",
            handler: (data) => {
              console.log("Tag number input", JSON.stringify(data));

              if (data.number < 2000 || data.number > 65000) {
                this.utils.displayAlert("Invalid tag number");

                return;
              }

              const minor = Number(data.number).toString();

              var unsubscribe = this.afs
                .collection<Tag>("Tags")
                .doc(minor)
                .ref.onSnapshot(
                  (doc) => {
                    unsubscribe();

                    console.log("Checking if document exists...");

                    if (doc.exists) {
                      console.log("Document exists");

                      if (!doc.data().placeholder) {
                        this.mixpanel
                          .track("tag_already_in_use", { tag: minor })
                          .then(() => { })
                          .catch((e) => {
                            console.error("Mixpanel Error", e);
                          });

                        // someone already registered this tag, display an error

                        this.toast
                          .showWithOptions({
                            message:
                              "Unable to replace tag: Tag number is already in use",
                            duration: 3500,
                            position: "center",
                          })
                          .subscribe((toast) => {
                            console.log(JSON.stringify(toast));
                          });

                        reject();
                      } else {
                        console.log(JSON.stringify(this.tag));

                        // Save original tag ID
                        // let original_tagId = this.tag.tagId;
                        let original_tagId = this.navParams.data;

                        // Assign new tag ID from scanned QR
                        this.tag.tagId = minor;
                        this.tag.tagattached = true;
                        this.tag.lastseen = "";
                        this.tag.hw.batt = -1;

                        // Create new document with new tagID
                        this.afs
                          .collection<Tag>("Tags")
                          .doc(minor)
                          .set(this.tag)
                          .then(() => {
                            this.mixpanel
                              .track("tag_replaced", { tag: minor })
                              .then(() => { })
                              .catch((e) => {
                                console.error("Mixpanel Error", e);
                              });

                            // Delete original tag document
                            console.log(
                              "Removing original document: " + original_tagId
                            );

                            this.deleteTag(original_tagId)
                              .then(() => {
                                console.log(
                                  "replaceTag(): Removed original document " +
                                  original_tagId
                                );

                                this.toast
                                  .showWithOptions({
                                    message: "Tag replaced successfully!",
                                    duration: 1500,
                                    position: "center",
                                    // addPixelsY: 120
                                  })
                                  .subscribe((toast) => {
                                    console.log(JSON.stringify(toast));

                                    this.navCtrl.pop();
                                  });

                                resolve(true);
                              })
                              .catch((e) => {
                                console.error(
                                  "replaceTag(): Unable to remove original document " +
                                  e
                                );
                                reject();
                              });
                          })
                          .catch((error) => {
                            console.error(
                              "replaceTag(): Unable to add tag: " +
                              JSON.stringify(error)
                            );
                            reject();
                          });
                      }
                    } else {
                      console.log("Document does not exist");
                      // Legacy code for existing QR sticker tags

                      // Save original tag ID
                      let original_tagId = this.navParams.data;

                      // Assign new tag ID from scanned QR
                      this.tag.tagId = minor;
                      this.tag.tagattached = true;
                      this.tag.lastseen = "";
                      this.tag.hw.batt = -1;

                      if (!this.tag.type) {
                        this.tag.type = "dog";
                      }

                      // Create new document with new tagID
                      this.afs
                        .collection<Tag>("Tags")
                        .doc(minor)
                        .set(this.tag)
                        .then(() => {
                          this.mixpanel
                            .track("tag_replaced", { tag: minor })
                            .then(() => { })
                            .catch((e) => {
                              console.error("Mixpanel Error", e);
                            });
                          // Delete original tag document
                          this.deleteTag(original_tagId)
                            .then(() => {
                              console.log(
                                "replaceTag(): Removed original document " +
                                original_tagId
                              );

                              this.toast
                                .showWithOptions({
                                  message: "Tag replaced successfully!",
                                  duration: 1500,
                                  position: "center",
                                })
                                .subscribe((toast) => {
                                  this.navCtrl.pop();

                                  console.log(JSON.stringify(toast));
                                });

                              resolve(true);
                            })
                            .catch((e) => {
                              console.error(
                                "replaceTag(): Unable to remove original document " +
                                e
                              );

                              reject();
                            });
                        })
                        .catch((error) => {
                          console.error(
                            "replaceTag(): Unable to add tag: " +
                            JSON.stringify(error)
                          );

                          reject();
                        });
                    }
                  },
                  (onError) => {
                    console.error(onError.message);

                    reject();
                  }
                );
            },
          },
        ],
      });

      if (!this.tag.tagattached) {
        this.utils.displayAlert("Tag not attached.");
        resolve(true);
      } else {
        prompt.present();
      }
    });
  }

  // scanQR() {
  //   this.mixpanel
  //     .track("scan_qr")
  //     .then(() => {})
  //     .catch(e => {
  //       console.error("Mixpanel Error", e);
  //     });

  //   this.qrProvider
  //     .scan()
  //     .then(() => {
  //       var minor = this.qrProvider.getScannedTagId().minor;

  //       this.mixpanel
  //         .track("scan_success", { tag: minor })
  //         .then(() => {})
  //         .catch(e => {
  //           console.error("Mixpanel Error", e);
  //         });

  //       var unsubscribe = this.afs
  //         .collection<Tag>("Tags")
  //         .doc(minor)
  //         .ref.onSnapshot(doc => {
  //           console.log("Retrieved document");

  //           if (doc.exists) {
  //             this.mixpanel
  //               .track("tag_already_in_use", { tag: minor })
  //               .then(() => {})
  //               .catch(e => {
  //                 console.error("Mixpanel Error", e);
  //               });

  //             // someone already registered this tag, display an error
  //             this.utils.displayAlert(
  //               "Unable to use tag",
  //               "Scanned tag is already in use"
  //             );
  //           } else {
  //             this.mixpanel
  //               .track("tag_change_success", { tag: minor })
  //               .then(() => {})
  //               .catch(e => {
  //                 console.error("Mixpanel Error", e);
  //               });

  //             this.utils.displayAlert(
  //               "Tag changed successfully"
  //               // 'Save changes to update tag settings'
  //             );

  //             this.original_tagId = this.tag.tagId;

  //             this.tag.tagId = minor;
  //             this.tag.lastseen = "";
  //             this.tag.tagattached = true;

  //             this.save();
  //           }

  //           unsubscribe();
  //         });
  //     })
  //     .catch(e => {
  //       this.mixpanel
  //         .track("scan_qr_error")
  //         .then(() => {})
  //         .catch(e => {
  //           console.error("Mixpanel Error", e);
  //         });

  //       console.error("Unable to scan QR code: " + JSON.stringify(e));
  //     });
  // }

  changePicture() {
    this.mixpanel
      .track("change_picture", { tag: this.tag.tagId })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      buttons: [
        {
          text: "Take a picture",
          icon: "camera",
          handler: () => {
            this.imageProvider
              .getPhoto(true)
              .then(async (photo) => {
                this.mixpanel
                  .track("change_picture_from_camera", { tag: this.tag.tagId })
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                this.tag.img = this.win.Ionic.WebView.convertFileSrc(
                  photo.toString()
                );

                window.document
                  .getElementById("#image")
                  .setAttribute("src", photo.toString());

                // this.tag.img = photo.toString();
                this.photoChanged = true;

                this.utils.displayAlert(
                  "Photo replaced successfully! Please allow a few seconds for the system to update."
                );

                await this.save()
                  .then(() => {
                    console.log("Tag Data Saved successfully");
                  })
                  .catch((e) => {
                    console.error(e);
                  });
              })
              .catch((e) => {
                this.mixpanel
                  .track("change_picture_from_camera_error", { error: e })
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                console.error("Could not take photo: " + e);
              });
          },
        },
        {
          text: "From Gallery",
          icon: "images",
          handler: () => {
            this.imageProvider
              .getPhoto(false)
              .then(async (photo) => {
                this.mixpanel
                  .track("change_picture_from_gallery", { tag: this.tag.tagId })
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                // window.document.getElementById(
                //   "image"
                // ).style.backgroundImage = `url(${photo})`;

                this.tag.img = this.win.Ionic.WebView.convertFileSrc(
                  photo.toString()
                );

                window.document
                  .getElementById("#image")
                  .setAttribute("src", photo.toString());

                // this.tag.img = photo.toString();
                this.photoChanged = true;

                this.utils.displayAlert(
                  "Photo replaced successfully! Please allow a few seconds for the system to update."
                );

                await this.save()
                  .then(() => {
                    console.log("Tag Data Saved successfully");
                  })
                  .catch((e) => {
                    console.error(e);
                  });
              })
              .catch((e) => {
                this.mixpanel
                  .track("change_picture_from_camera_error", { error: e })
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                console.error("Could not get photo: " + e);
              });
          },
        },
        {
          text: "Cancel",
          role: "cancel",
          handler: () => { },
        },
      ],
    });

    actionSheet.present();
  }

  addCoOwner() {
    this.mixpanel
      .track("add_co_owner", { tag: this.tag.tagId })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    this.showLoading();

    this.authProvider
      .getAccountInfo(false)
      .then((account) => {
        this.utils
          .generateCoOwnerCode(this.tag)
          .then((code) => {
            this.dismissLoading();

            let alert = this.alertCtrl.create({
              title: `Co-Owner Code`,
              message: `Your unique one time code is ${code}. Please share it with your co-owner.`,
              buttons: [
                {
                  text: "Share via Text",
                  handler: () => {
                    this.mixpanel
                      .track("share_co_owner_via_text")
                      .then(() => { })
                      .catch((e) => {
                        console.error("Mixpanel Error", e);
                      });

                    // this.sms
                    //   .hasPermission()
                    //   .then(() => {
                    this.sms
                      .send(
                        "",
                        `I just added you as ${this.tag.name}'s co-owner using Huan! Your one-time co-owner code is ${code}.\rPlease visit https://gethuan.com/co-owner/ for a quick how-to.`
                      )
                      .catch((error) => {
                        console.error("Unable to send Message", error);
                      });
                    // })
                    // .catch(e => {
                    //   console.error(e);
                    // });
                  },
                },

                {
                  text: "Close",
                  role: "cancel",
                  handler: () => { },
                },
              ],
            });

            alert.present();
            // this.utils.displayAlert(
            //   'Co-Owner Code',
            //   `Your unique one time code is ${code}. Please share it with your co-owner.`
            // );
          })
          .catch((e) => {
            this.dismissLoading();

            console.error("genreateCoOwnerCode", e);
          });
      })
      .catch((e) => {
        this.dismissLoading();

        console.error("addCoOwner(): ERROR: Unable to get account info!", e);
      });
  }

  delete() {
    this.mixpanel
      .track("delete_tag", { tag: this.tag.tagId })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    let confirm = this.alertCtrl.create({
      title: "Delete " + this.tag.name,
      message: "Are you sure?",
      buttons: [
        {
          text: "Cancel",
          handler: () => {
            this.mixpanel
              .track("cancel_clicked")
              .then(() => { })
              .catch((e) => {
                console.error("Mixpanel Error", e);
              });

            console.log("Cancel clicked");
          },
        },
        {
          text: "Delete",
          handler: () => {
            this.mixpanel
              .track("delete_confirmed", { tag: this.tag.tagId })
              .then(() => { })
              .catch((e) => {
                console.error("Mixpanel Error", e);
              });

            var tagId = this.tag.tagId;

            this.afs
              .collection("Tags")
              .doc(tagId)
              .set({
                placeholder: true,
                lost: false,
                created: firebase.firestore.FieldValue.serverTimestamp(),
              })
              .then(() => {
                console.log("Created placeholder");
                this.mixpanel
                  .track("tag_deleted", { tag: tagId })
                  .then(() => { })
                  .catch((e) => {
                    console.error("Mixpanel Error", e);
                  });

                this.markerProvider
                  .deleteMarker(tagId)
                  .then(() => {
                    this.navCtrl.pop();
                  })
                  .catch((e) => {
                    this.navCtrl.pop();
                    console.error(JSON.stringify(e));
                  });
              })
              .catch((e) => {
                console.error(JSON.stringify(e));
              });
          },
        },
      ],
      cssClass: "alertclass",
    });

    confirm.present();
  }

  onBreedChange() {
    console.log("Breed Changed: " + JSON.stringify(this.tag.breed));

    this.mixpanel
      .track("breed_changed", { tag: this.tag.tagId, breed: this.tag.breed })
      .then(() => { })
      .catch((e) => {
        console.error("Mixpanel Error", e);
      });

    let index = -1;

    if (
      this.tag.breed.some(
        (b) => this.tagProvider.getDogBreeds().indexOf(b) >= 0
      ) &&
      this.tag.breed.some(
        (b) => this.tagProvider.getCatBreeds().indexOf(b) >= 0
      )
    ) {
      this.utils.displayAlert(
        "Creating Cat/Dog hybrids is not supported at the moment.",
        "Let's hope it never is."
      );
      this.tagForm.get("breed").setErrors({ invalid: true });
    }

    this.save()
      .then(() => {
        console.log("Tag Data Saved successfully");
      })
      .catch((e) => {
        console.error(e);
      });
  }

  changeType() {
    if (this.tag.type == "dog") {
      this.breeds = this.tagProvider.getDogBreeds();
    } else {
      this.breeds = this.tagProvider.getCatBreeds();
    }

    this.save()
      .then(() => {
        console.log("Tag Data Saved successfully");
      })
      .catch((e) => {
        console.error(e);
      });
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingCtrl.create({
        content: "Please Wait...",
        dismissOnPageChange: true,
        duration: 10,
      });
      this.loader.present();
    }
  }

  dismissLoading() {
    if (this.loader) {
      this.loader.dismiss();
      this.loader = null;
    }
  }

  getBattInfoUpdated(timestamp) {
    return moment(timestamp.toDate()).fromNow();
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
