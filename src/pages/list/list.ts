import {
  throwError as observableThrowError,
  Observable,
  ReplaySubject
} from "rxjs";
import { Component, ViewChild, OnDestroy, NgZone } from "@angular/core";
import {
  IonicPage,
  NavController,
  AlertController,
  Platform,
  PopoverController,
  Content,
  normalizeURL,
  ActionSheetController
} from "ionic-angular";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { UtilsProvider } from "../../providers/utils/utils";
import { AuthProvider } from "../../providers/auth/auth";
import { LocationProvider } from "../../providers/location/location";
import { Tag } from "../../providers/tag/tag";
import { MarkerProvider } from "../../providers/marker/marker";
import {
  map,
  retry,
  takeUntil,
  catchError,
  throttleTime,
  take
} from "rxjs/operators";
import { BleProvider } from "../../providers/ble/ble";
import { QrProvider } from "../../providers/qr/qr";
import firebase from "firebase";
import { NotificationProvider } from "../../providers/notification/notification";
import { Mixpanel } from "@ionic-native/mixpanel";
import { Toast } from "@ionic-native/toast";
import { ImageLoader } from "ionic-image-loader";
import { SettingsProvider } from "../../providers/settings/settings";
import { Slides } from "ionic-angular";

@IonicPage()
@Component({
  selector: "page-list",
  templateUrl: "list.html"
})
export class ListPage implements OnDestroy {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  private tagInfo = [];
  private townName = {};
  private locationName = {};

  private box_height;
  tag$: Observable<Tag[]>;

  private drawerHeight = 200;

  @ViewChild(Content)
  content: Content;

  @ViewChild(Slides) slides: Slides;

  private bluetooth;
  private auth;

  private country;

  private invites;

  private unattached_tags = 0;

  // User account information - for home info
  private account: any = null;
  private win: any = window;

  private list_type: any = "grid";

  private my_uid: any;

  constructor(
    public navCtrl: NavController,
    public afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    public alertCtrl: AlertController,
    private utilsProvider: UtilsProvider,
    private authProvider: AuthProvider,
    private platform: Platform,
    private locationProvider: LocationProvider,
    public popoverCtrl: PopoverController,
    private markerProvider: MarkerProvider,
    private ble: BleProvider,
    private qrProvider: QrProvider,
    private notificationProvider: NotificationProvider,
    private mixpanel: Mixpanel,
    private toast: Toast,
    private actionSheetCtrl: ActionSheetController,
    private imageLoader: ImageLoader,
    private zone: NgZone,
    private settingsProvider: SettingsProvider
  ) {
    console.log("Initializing List Page");

    this.platform.ready().then(() => {
      this.list_type = this.settingsProvider.getSettings().value.petListMode;
      if (this.list_type == undefined) {
        this.list_type = "grid";
      }

      this.ble.getBluetoothStatus().subscribe(status => {
        this.bluetooth = status;
      });

      this.ble.getAuthStatus().subscribe(status => {
        this.auth = status;
      });

      ///////////
      // XXXX
      ///////////

      this.authProvider.getUserId().then(uid => {
        this.my_uid = uid;

        try {
          this.tag$ = this.afs
            .collection<Tag>("Tags", ref =>
              ref
                .where("uid", "array-contains", uid)
                .orderBy("name", "asc")
                .orderBy("tagattached")
            )
            .snapshotChanges()
            .pipe(
              catchError(e => observableThrowError(e)),
              retry(2),
              map(actions =>
                actions.map(a => {
                  const data = a.payload.doc.data({
                    serverTimestamps: "previous"
                  }) as Tag;
                  const id = a.payload.doc.id;
                  return { id, ...data };
                })
              )
            )
            .takeUntil(this.destroyed$);
        } catch (e) {
          console.error(e);
        }

        try {
          this.tag$.subscribe(
            tag => {
              if (tag.length === 0) {
                this.unattached_tags = 0;
              } else {
                this.checkUnattachedTags();
              }

              this.tagInfo = tag;
            },
            error => {
              console.error("ERROR", JSON.stringify(error));
            }
          );

          // Initialize tag images by preloading them once
          this.tag$.pipe(take(1)).subscribe(tag => {
            tag.forEach((t, i) => {
              this.imageLoader
                .preload(t.img)
                .then(r => {
                  // console.log('Preloading', t.img, r);
                })
                .catch(e => {
                  console.error(e);
                });
            });
          });

          // Refresh tag images/location data every minute
          this.tag$.pipe(throttleTime(5000)).subscribe(tag => {
            tag.forEach((t, i) => {
              this.imageLoader
                .preload(t.img)
                .then(r => {
                  // console.log('Preloading', t.img, r);
                })
                .catch(e => {
                  console.error(e);
                });

              this.updateLocationName(t);
            });
          });
        } catch (e) {
          console.error(e);
        }
      });

      ///////////
      // XXXX
      ///////////

      this.authProvider
        .getAccountInfo()
        .then(account => {
          console.log("ListPage: Account info: " + JSON.stringify(account));

          if (account !== undefined) {
            this.account = account;
          }
        })
        .catch(error => {
          console.error("ListPage: Unable to get account info: " + error);
        });

      this.checkUnattachedTags();
    });

    this.locationProvider
      .getCountry()
      .then(country => {
        this.country = country;
      })
      .catch(e => {
        console.error(e);
      });
  }

  checkUnattachedTags() {
    // Check for unattached tags
    this.authProvider.getUserId().then(uid => {
      const unsub = this.afs
        .collection<Tag>("Tags", ref =>
          ref
            .where("uid", "array-contains", uid)
            .where("tagattached", "==", false)
            .where("order_status", "==", "none")
        )
        .stateChanges()
        .pipe(
          catchError(e => observableThrowError(e)),
          retry(2),
          takeUntil(this.destroyed$),
          map(actions =>
            actions.map(a => {
              const data = a.payload.doc.data() as any;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .subscribe(t => {
          unsub.unsubscribe();
          this.unattached_tags = t.length;
        });
    });
  }

  trackByTags(index: number, tag: Tag) {
    return tag.img;
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  ionViewDidLoad() {
    this.box_height = 340;
  }

  ionViewDidEnter() {
    this.mixpanel
      .track("my_pets_page")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.checkUnattachedTags();
  }

  ionViewWillEnter() {
    /*
    this.authProvider.getUserId().then(uid => {
      this.my_uid = uid;

      try {
        this.tag$ = this.afs
          .collection<Tag>("Tags", ref =>
            ref
              .where("uid", "array-contains", uid)
              .orderBy("name", "asc")
              .orderBy("tagattached")
          )
          .snapshotChanges()
          .pipe(
            throttleTime(5000),
            catchError(e => observableThrowError(e)),
            retry(2),
            map(actions =>
              actions.map(a => {
                const data = a.payload.doc.data({
                  serverTimestamps: "previous"
                }) as Tag;
                const id = a.payload.doc.id;
                return { id, ...data };
              })
            )
          )
          .takeUntil(this.destroyed$);
      } catch (e) {
        console.error(e);
      }

      try {
        this.tag$.subscribe(
          tag => {
            if (tag.length === 0) {
              this.unattached_tags = 0;
            } else {
              this.checkUnattachedTags();
            }

            this.tagInfo = tag;
          },
          error => {
            console.error("ERROR", JSON.stringify(error));
          }
        );

        // Initialize tag images by preloading them once
        this.tag$.pipe(take(1)).subscribe(tag => {
          tag.forEach((t, i) => {
            this.imageLoader
              .preload(t.img)
              .then(r => {
                // console.log('Preloading', t.img, r);
              })
              .catch(e => {
                console.error(e);
              });
          });
        });

        // Refresh tag images/location data every minute
        this.tag$.pipe(throttleTime(5000)).subscribe(tag => {
          tag.forEach((t, i) => {
            this.updateLocationName(t);
          });
        });
      } catch (e) {
        console.error(e);
      }
    });
    */
    this.slides.lockSwipes(true);
    this.goToSlide();
  }

  lastSeen(lastseen) {
    return this.utilsProvider.getLastSeen(lastseen);
  }

  isLost(tagId): boolean {
    for (var i = 0; i < this.tagInfo.length; i++) {
      var tag,
        val = this.tagInfo[i];

      if (typeof val.data === "function") {
        tag = val.data();
      } else {
        tag = val;
      }

      if (tag.tagId == tagId) {
        return tag.lost !== false;
      }
    }
  }

  getCssClass(tagId) {
    let lost = this.isLost(tagId);
    var style = {
      marklost: !lost,
      markfound: lost
    };

    return style;
  }

  getSubtitleCssClass(tagId) {
    let lost = this.isLost(tagId);

    var signal;
    try {
      signal = this.getTags()[tagId].lastseen;
    } catch {
      signal = false;
    }

    var style = {
      "card-subtitle-no-signal": !signal,
      "card-subtitle-lost": lost && signal,
      "card-subtitle": !lost && signal
    };

    return style;
  }

  getTags() {
    var formattedTagInfo = [];

    for (var i = 0; i < this.tagInfo.length; i++) {
      var tag,
        val = this.tagInfo[i];

      if (typeof val.data === "function") {
        tag = val.data();
      } else {
        tag = val;
      }

      formattedTagInfo[tag.tagId] = tag;

      // console.log(JSON.stringify(tag.lastseen));

      // If lastseen is null, Firestore has not yet updated the server timestamp since
      // it's too recent. set it to now().

      // if (!formattedTagInfo[tag.tagId].lastseen) {
      //   formattedTagInfo[tag.tagId].lastseen = Date.now();
      // }
    }

    return formattedTagInfo;
  }

  getTitleText(tag) {
    if (tag.name.length > 2) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize =
        "2.5em";
    }

    if (tag.name.length > 10) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize = "2em";
    }

    if (tag.name.length > 15) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize =
        "1.5em";
    }

    if (tag.name.length > 20) {
      document.getElementById(`card-title${tag.tagId}`).style.fontSize = "1em";
    }

    return tag.name;
  }

  getTagWarnings(tagId) {
    var formattedTagInfo = this.getTags();

    try {
      if (
        formattedTagInfo[tagId].tagattached === false &&
        formattedTagInfo[tagId].order_status === "none"
      ) {
        return true;
      }

      // Return a warning if a tag has not been seen in 5 days
      if (
        formattedTagInfo[tagId].lastseen &&
        Date.now() - formattedTagInfo[tagId].lastseen.toDate() >
          60 * 60 * 24 * 5 * 1000
      ) {
        return true;
      }
    } catch (e) {
      console.error("getTagWarnings: " + JSON.stringify(e));
    }
  }

  getSubtitleText(tagId) {
    var formattedTagInfo = this.getTags();

    if (formattedTagInfo[tagId]) {
      if (this.isLost(tagId)) {
        try {
          return (
            "Marked as lost " +
            this.lastSeen(formattedTagInfo[tagId].markedlost.toDate())
          );
        } catch (e) {
          return "Marked as lost";
        }
      } else {
        try {
          if (formattedTagInfo[tagId].lastseen) {
            return (
              "Last seen " +
              this.lastSeen(formattedTagInfo[tagId].lastseen.toDate())
            );
          } else {
            return "Waiting for Signal...";
          }
        } catch (e) {
          return "Waiting for Signal...";
        }
      }
    } else {
      return " ";
    }
  }

  getBatteryIcon(batt) {
    if (batt > 66) {
      return normalizeURL("assets/imgs/battery-100.png");
    } else if (batt > 33) {
      return normalizeURL("assets/imgs/battery-66.png");
    } else if (batt > 0) {
      return normalizeURL("assets/imgs/battery-33.png");
    } else if (batt === 0) {
      return normalizeURL("assets/imgs/battery-0.png");
    } else if (batt === -1) {
      return "";
    }
  }

  expandCollapseItem(tagId) {
    this.mixpanel
      .track("expand_collapse_item", { tag: tagId })
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    let item = document.getElementById(`list-item${tagId}`);
    let element = document.getElementById(`details${tagId}`);
    let expand = document.getElementById(`expand-arrow${tagId}`);
    let collapse = document.getElementById(`collapse-arrow${tagId}`);

    switch (element.style.height) {
      case "0px":
        item.style.height =
          Number(this.box_height + this.drawerHeight).toString() + "px";
        expand.style.display = "none";
        collapse.style.display = "block";
        // element.style.opacity = '1';
        element.style.height = this.drawerHeight + "px";
        break;
      case this.drawerHeight + "px":
        item.style.height = this.box_height + "px";
        collapse.style.display = "none";
        element.style.height = "0px";
        // element.style.opacity = '0';
        expand.style.display = "block";
        break;
    }
  }

  updateLocationName(tag) {
    if (this.account !== null) {
      let distance = this.utilsProvider.distanceInMeters(
        tag.location,
        this.account.address_coords
      );

      if (distance >= 100) {
        console.log(tag.tagId, distance, "refreshing location info");

        this.locationProvider
          .getLocationName(tag.location)
          .then(loc => {
            this.locationName[tag.tagId] = loc;
          })
          .catch(error => {
            console.log("updateLocationName():" + error);
          });
      }
    }
  }

  getTownName(tagId) {
    if (this.townName[tagId] !== undefined) {
      return this.townName[tagId];
    } else {
      return "";
    }
  }

  getLocationName(tag) {
    if (this.account !== null) {
      let distance = this.utilsProvider.distanceInMeters(
        tag.location,
        this.account.address_coords
      );

      if (distance < 50 && distance >= 0) {
        return "Home";
      } else if (distance === -1) {
        return "Unknown";
      } else {
        if (this.locationName[tag.tagId] !== undefined) {
          var distanceFromHome = this.getDistanceFromHome(tag);

          return `Near ${
            this.locationName[tag.tagId]
          } (${distanceFromHome} miles from Home)`;
        } else {
          return "Updating...";
        }
      }
    }
  }

  getDistanceFromHome(tag) {
    return Number(
      (this.utilsProvider.distanceInMeters(
        tag.location,
        this.account.address_coords
      ) /
        1000) *
        0.6
    ).toFixed(1);
  }

  getTagImgSrc(tag) {
    return tag.img;
  }

  markAsText(tagId) {
    if (!this.isLost(tagId)) {
      return "Mark as lost";
    } else {
      return "Mark as found";
    }
  }

  markAsFunc(tagId) {
    if (!this.isLost(tagId)) {
      this.markAsLost(tagId);
    } else {
      this.markAsFound(tagId);
    }
  }

  markAsLost(tagId) {
    console.log("Mark As Lost clicked");

    this.afs
      .collection<Tag>("Tags")
      .doc(tagId)
      .ref.get()
      .then(data => {
        let confirm = this.alertCtrl.create({
          title: "Mark " + data.get("name") + " as lost",
          message: "This will notify everyone in your community. Are you sure?",
          buttons: [
            {
              text: "Cancel",
              handler: () => {
                console.log("Cancel clicked");
              }
            },
            {
              text: "Mark Lost!",
              handler: () => {
                this.mixpanel
                  .track("mark_as_lost", { tag: tagId })
                  .then(() => {})
                  .catch(e => {
                    console.error("Mixpanel Error", e);
                  });

                let name = data.get("name");
                let pronoun = data.get("gender") === "Male" ? "his" : "her";
                this.utilsProvider.showInviteDialog(
                  "LOST PET - PLEASE READ",
                  `${name} is now marked as lost and an alert has been sent to your community.<br><br>
                  As soon as the signal from ${pronoun} Huan Tag is detected, you will be notified and ${pronoun} map location will update.`
                );

                this.afs
                  .collection<Tag>("Tags")
                  .doc(data.get("tagId"))
                  .update({
                    lost: true,
                    markedlost: firebase.firestore.FieldValue.serverTimestamp()
                  })
                  .then(() => {
                    this.markerProvider.deleteMarker(tagId).catch(e => {
                      console.error(JSON.stringify(e));
                    });

                    // Workaround since firestore still hasnt updated the lost field here
                    var tag = data.data();
                    tag.lost = true;

                    this.markerProvider
                      .addPetMarker(tag, true)
                      .then(() => {})
                      .catch(e => {
                        console.error("addPetMarker", e);
                      });
                  });
              }
            }
          ],
          cssClass: "alertclass"
        });

        confirm.present();
      });
  }

  markAsFound(tagId) {
    this.afs
      .collection<Tag>("Tags")
      .doc(tagId)
      .ref.get()
      .then(data => {
        let confirm = this.alertCtrl.create({
          title: "Mark " + data.get("name") + " as found",
          message: "Are you sure?",
          buttons: [
            {
              text: "Cancel",
              handler: () => {
                console.log("Cancel clicked");
              }
            },
            {
              text: "Mark Found!",
              handler: () => {
                // this.expandCollapseItem(tagId);
                this.mixpanel
                  .track("mark_as_found", { tag: tagId })
                  .then(() => {})
                  .catch(e => {
                    console.error("Mixpanel Error", e);
                  });

                this.afs
                  .collection<Tag>("Tags")
                  .doc(data.get("tagId"))
                  .update({
                    lost: false,
                    markedfound: firebase.firestore.FieldValue.serverTimestamp()
                  })
                  .then(() => {
                    this.markerProvider.deleteMarker(tagId).catch(e => {
                      console.error(JSON.stringify(e));
                    });

                    // Workaround since firestore still hasnt updated the lost field here
                    var tag = data.data();
                    tag.lost = false;

                    this.markerProvider
                      .addPetMarker(tag, true)
                      .then(() => {})
                      .catch(e => {
                        console.error("addPetMarker", e);
                      });
                  });
              }
            }
          ],
          cssClass: "alertclass"
        });

        confirm.present();
      });
  }

  sharePet(tag) {
    if (tag.lost == false) {
      this.utilsProvider.sharePet(tag);
    } else {
      this.utilsProvider.share(
        `${tag.name} is missing! Please join Huan and help me find ${
          tag.gender == "Male" ? "him" : "her"
        }!`,
        `${tag.name} is missing!`,
        tag.alert_post_url
          ? tag.alert_post_url
          : "https://fetch.gethuan.com/mobile",
        "Share Huan"
      );
    }
  }

  showCoOwnerCodePrompt() {
    const prompt = this.alertCtrl.create({
      title: "Co-Owner Code",
      message:
        "Please request a co-owner code from the original owner. The code can be generated through the Pet Profile page.",
      inputs: [
        {
          name: "code",
          placeholder: "Code",
          type: "number"
        }
      ],
      buttons: [
        {
          text: "Cancel",
          handler: data => {
            console.log("Cancel clicked");
          }
        },
        {
          text: "Verify",
          handler: data => {
            console.log("Verify", JSON.stringify(data));
            if (data.code.length < 4) {
              this.utilsProvider.displayAlert(
                "Error",
                "Unable to verify code. Please try again."
              );

              this.mixpanel
                .track("co_owner_verify_failed_code_length")
                .then(() => {})
                .catch(e => {
                  console.error("Mixpanel Error", e);
                });
            } else {
              var sub = this.afs
                .collection<Tag>("Tags")
                .ref.where("coowner_code", "==", Number(data.code))
                .get()
                .then(
                  data => {
                    if (data.size == 1) {
                      data.forEach(tag => {
                        console.log(
                          "co-owner code found for tag",
                          tag.data().tagId
                        );

                        this.authProvider.getUserId().then(uid => {
                          if (tag.data().uid.includes(uid)) {
                            this.utilsProvider.displayAlert(
                              "Error",
                              `You are already registered as an owner for ${
                                tag.data().name
                              }.`
                            );

                            this.mixpanel
                              .track("co_owner_verify_failed_self")
                              .then(() => {})
                              .catch(e => {
                                console.error("Mixpanel Error", e);
                              });
                          } else {
                            this.utilsProvider
                              .addCoOwnerToTag(tag.data().tagId, uid)
                              .then(() => {
                                this.utilsProvider
                                  .clearTagCoOwnerCode(tag.data())
                                  .then(() => {
                                    this.utilsProvider.displayAlert(
                                      "Congratulations!",
                                      `You are now ${
                                        tag.data().name
                                      }'s co-owner!`
                                    );

                                    this.mixpanel
                                      .track("co_owner_add_success")
                                      .then(() => {})
                                      .catch(e => {
                                        console.error("Mixpanel Error", e);
                                      });
                                  })
                                  .catch(e => {
                                    console.error("clearTagCoOwnerCode", e);
                                  });
                              })
                              .catch(e => {
                                console.error("addCoOwnerToTag", e);
                              });
                          }
                        });
                      });
                    } else {
                      this.utilsProvider.displayAlert(
                        "Error",
                        "Unable to verify code. Please try again."
                      );

                      this.mixpanel
                        .track("co_owner_verify_failed_multiple_matches")
                        .then(() => {})
                        .catch(e => {
                          console.error("Mixpanel Error", e);
                        });
                    }
                  },
                  e => {
                    console.error("showCoOwnerCodePrompt", e);
                  }
                );
            }
          }
        }
      ]
    });
    prompt.present();
  }

  addTag() {
    this.mixpanel
      .track("add_pet_clicked")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    let actionSheet = this.actionSheetCtrl.create({
      enableBackdropDismiss: true,
      title: "I want to...",
      buttons: [
        {
          text: "Add a new Pet",
          icon: "add-circle",
          handler: () => {
            this.navCtrl.parent.parent.push("AddPage");
          }
        },
        {
          text: "Become a co-owner",
          icon: "contacts",
          handler: () => {
            this.mixpanel
              .track("become_co_owner_clicked")
              .then(() => {})
              .catch(e => {
                console.error("Mixpanel Error", e);
              });

            this.showCoOwnerCodePrompt();
          }
        },
        {
          text: "Cancel",
          role: "cancel",
          handler: () => {
            console.log("Cancel clicked");
          }
        }
      ]
    });

    actionSheet.present();
  }

  showTag(tagItem) {
    this.navCtrl.push("ShowPage", tagItem);
  }

  showOnMap(tagId) {
    try {
      var latlng = this.markerProvider.getMarker(tagId).getPosition();

      this.markerProvider.hideOtherMarkers(tagId);

      console.log("Showing marker at " + latlng);
      this.markerProvider.getMap().moveCamera({
        target: latlng,
        zoom: 17,
        duration: 2000
      });

      // Switch to Map Tab
      this.navCtrl.parent.select(0);
    } catch (e) {
      console.error("showOnMap: " + e);
    }
  }

  editTag(tagItem) {
    this.navCtrl.parent.parent.push("EditPage", tagItem);
  }

  scrollToElement(id) {
    console.log("Scrolling to " + id);

    var el = document.getElementById(id);

    if (el !== null) {
      this.content.scrollTo(0, el.offsetTop - this.drawerHeight, 800);
    } else {
      console.log(`Element ${id} is undefined`);
    }
  }

  gotoOrderPage() {
    this.mixpanel
      .track("get_tags")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    // this.navCtrl.parent.parent.push('OrderTagPage');
    this.navCtrl.parent.parent.push("ChooseSubscriptionPage");
  }

  deleteTag(tagId) {
    return new Promise((resolve, reject) => {
      this.afs
        .collection("Tags")
        .doc(tagId)
        .set({
          placeholder: true,
          lost: false,
          created: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          console.log("Created placeholder");

          this.markerProvider.deleteMarker(tagId).catch(e => {
            console.error(JSON.stringify(e));
          });

          resolve(true);
        })
        .catch(e => {
          console.error(JSON.stringify(e));
          reject(e);
        });

      // this.afs
      //   .collection<Tag>('Tags')
      //   .doc(tagId)
      //   .delete()
      //   .then(() => {
      //     this.markerProvider.deleteMarker(tagId);
      //     resolve(true);
      //   })
      //   .catch(error => {
      //     console.error('Unable to delete: ' + JSON.stringify(error));
      //     reject(error);
      //   });
    });
  }

  attachTag(tag) {
    this.mixpanel
      .track("attach_tag")
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    this.ble.disableMonitoring();

    const prompt = this.alertCtrl.create({
      title: "Attcah Tag",
      message: "Please type the tag number",
      inputs: [
        {
          name: "number",
          placeholder: "0000",
          type: "number",
          min: 4000,
          max: 65000
        }
      ],
      buttons: [
        {
          text: "Cancel",
          handler: data => {
            console.log("Cancel clicked");
          }
        },
        {
          text: "Attach Tag",
          handler: data => {
            console.log("Tag number input", JSON.stringify(data));

            if (
              data.number < 4000 ||
              data.number > 65000 ||
              data.number.includes(".")
            ) {
              this.utilsProvider.displayAlert("Invalid tag number");

              return;
            }

            const minor = Number(data.number).toString();

            var unsubscribe = this.afs
              .collection<Tag>("Tags")
              .doc(minor)
              .ref.onSnapshot(doc => {
                unsubscribe();

                if (doc.exists) {
                  if (!doc.data().placeholder) {
                    this.mixpanel
                      .track("tag_already_in_use", { tag: minor })
                      .then(() => {})
                      .catch(e => {
                        console.error("Mixpanel Error", e);
                      });

                    // someone already registered this tag, display an error
                    this.toast
                      .showWithOptions({
                        message: "Tag is already in use",
                        duration: 3500,
                        position: "center"
                      })
                      .subscribe(toast => {
                        console.log(JSON.stringify(toast));
                      });
                    this.ble.enableMonitoring();
                  } else {
                    // Save original tag ID
                    let original_tagId = tag.tagId;

                    // Assign new tag ID from scanned QR
                    tag.tagId = minor;
                    tag.tagattached = true;
                    tag.activated = firebase.firestore.FieldValue.serverTimestamp();
                    tag.lastseen = "";

                    var batch = this.afs.firestore.batch();
                    batch.set(
                      this.afs.firestore.collection("Tags").doc(minor),
                      tag
                    );
                    batch.delete(
                      this.afs.firestore.collection("Tags").doc(original_tagId)
                    );
                    batch
                      .commit()
                      .then(r => {
                        console.log("Batch Commit: Tag attached success");
                        this.mixpanel
                          .track("tag_attached", { tag: minor })
                          .then(() => {})
                          .catch(e => {
                            console.error("Mixpanel Error", e);
                          });

                        // this.toast
                        //   .showWithOptions({
                        //     message: 'Tag attached successfully!',
                        //     duration: 3500,
                        //     position: 'center'
                        //   })
                        //   .subscribe(toast => {
                        //     console.log(JSON.stringify(toast));
                        //   });

                        this.utilsProvider.showInviteDialog(
                          "Tag Attached Successfully",
                          `Share Huan with your community so you can make ${tag.name} even safer and help other pet owners!`
                        );

                        this.ble.enableMonitoring();
                      })
                      .catch(e => {
                        this.mixpanel
                          .track("tag_attach_error", { tag: minor })
                          .then(() => {})
                          .catch(e => {
                            console.error("Mixpanel Error", e);
                          });

                        this.toast
                          .showWithOptions({
                            message: "ERROR: Unable to attach tag",
                            duration: 3500,
                            position: "center"
                          })
                          .subscribe(toast => {
                            console.log(JSON.stringify(toast));
                          });

                        this.ble.enableMonitoring();
                      });
                  }
                } else {
                  // Legacy code for existing QR sticker tags

                  // Save original tag ID
                  let original_tagId = tag.tagId;

                  // Assign new tag ID from scanned QR
                  tag.tagId = minor;
                  tag.tagattached = true;
                  tag.lastseen = "";

                  batch = this.afs.firestore.batch();
                  batch.set(
                    this.afs.firestore.collection("Tags").doc(minor),
                    tag
                  );
                  batch.delete(
                    this.afs.firestore.collection("Tags").doc(original_tagId)
                  );
                  batch
                    .commit()
                    .then(r => {
                      console.log("Batch Commit: Tag attached success");
                      this.mixpanel
                        .track("tag_attached", { tag: minor })
                        .then(() => {})
                        .catch(e => {
                          console.error("Mixpanel Error", e);
                        });

                      // this.toast
                      //   .showWithOptions({
                      //     message: 'Tag attached successfully!',
                      //     duration: 3500,
                      //     position: 'center'
                      //   })
                      //   .subscribe(toast => {
                      //     console.log(JSON.stringify(toast));
                      //   });

                      this.utilsProvider.showInviteDialog(
                        "Tag Attached Successfully",
                        `Share Huan with your community so you can make ${tag.name} even safer and help other pet owners!`
                      );

                      this.ble.enableMonitoring();
                    })
                    .catch(e => {
                      this.mixpanel
                        .track("tag_attach_error", { tag: minor })
                        .then(() => {})
                        .catch(e => {
                          console.error("Mixpanel Error", e);
                        });

                      this.toast
                        .showWithOptions({
                          message:
                            "Unable to attach tag. Please contact support.",
                          duration: 3500,
                          position: "center"
                        })
                        .subscribe(toast => {
                          console.log(JSON.stringify(toast));
                        });

                      this.ble.enableMonitoring();
                    });
                }
              });
          }
        }
      ]
    });
    prompt.present();

    //////////////////////////////////////////
    /*

    this.qrProvider
      .scan()
      .then(() => {
        var minor = this.qrProvider.getScannedTagId().minor;

        this.mixpanel
          .track('scan_qr_success', { tag: minor })
          .then(() => {})
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        var unsubscribe = this.afs
          .collection<Tag>('Tags')
          .doc(minor)
          .ref.onSnapshot(doc => {
            unsubscribe();

            if (doc.exists) {
              if (!doc.data().placeholder) {
                this.mixpanel
                  .track('tag_already_in_use', { tag: minor })
                  .then(() => {})
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                // someone already registered this tag, display an error
                this.toast
                  .showWithOptions({
                    message: 'Scanned tag is already in use',
                    duration: 3500,
                    position: 'center'
                  })
                  .subscribe(toast => {
                    console.log(JSON.stringify(toast));
                  });
                this.ble.enableMonitoring();
              } else {
                // Save original tag ID
                let original_tagId = tag.tagId;

                // Assign new tag ID from scanned QR
                tag.tagId = minor;
                tag.tagattached = true;
                tag.activated = firebase.firestore.FieldValue.serverTimestamp();
                tag.lastseen = '';

                var batch = this.afs.firestore.batch();
                batch.set(
                  this.afs.firestore.collection('Tags').doc(minor),
                  tag
                );
                batch.delete(
                  this.afs.firestore.collection('Tags').doc(original_tagId)
                );
                batch
                  .commit()
                  .then(r => {
                    console.log('Batch Commit: Tag attached success');
                    this.mixpanel
                      .track('tag_attached', { tag: minor })
                      .then(() => {})
                      .catch(e => {
                        console.error('Mixpanel Error', e);
                      });

                    // this.toast
                    //   .showWithOptions({
                    //     message: 'Tag attached successfully!',
                    //     duration: 3500,
                    //     position: 'center'
                    //   })
                    //   .subscribe(toast => {
                    //     console.log(JSON.stringify(toast));
                    //   });

                    this.utilsProvider.showInviteDialog(
                      'Tag Attached Successfully',
                      `Share Huan with your community so you can make ${tag.name} even safer and help other pet owners!`
                    );

                    this.ble.enableMonitoring();
                  })
                  .catch(e => {
                    this.mixpanel
                      .track('tag_attach_error', { tag: minor })
                      .then(() => {})
                      .catch(e => {
                        console.error('Mixpanel Error', e);
                      });

                    this.toast
                      .showWithOptions({
                        message: 'ERROR: Unable to attach tag',
                        duration: 3500,
                        position: 'center'
                      })
                      .subscribe(toast => {
                        console.log(JSON.stringify(toast));
                      });

                    this.ble.enableMonitoring();
                  });
              }
            } else {
              // Legacy code for existing QR sticker tags

              // Save original tag ID
              let original_tagId = tag.tagId;

              // Assign new tag ID from scanned QR
              tag.tagId = minor;
              tag.tagattached = true;
              tag.lastseen = '';

              batch = this.afs.firestore.batch();
              batch.set(this.afs.firestore.collection('Tags').doc(minor), tag);
              batch.delete(
                this.afs.firestore.collection('Tags').doc(original_tagId)
              );
              batch
                .commit()
                .then(r => {
                  console.log('Batch Commit: Tag attached success');
                  this.mixpanel
                    .track('tag_attached', { tag: minor })
                    .then(() => {})
                    .catch(e => {
                      console.error('Mixpanel Error', e);
                    });

                  // this.toast
                  //   .showWithOptions({
                  //     message: 'Tag attached successfully!',
                  //     duration: 3500,
                  //     position: 'center'
                  //   })
                  //   .subscribe(toast => {
                  //     console.log(JSON.stringify(toast));
                  //   });

                  this.utilsProvider.showInviteDialog(
                    'Tag Attached Successfully',
                    `Share Huan with your community so you can make ${tag.name} even safer and help other pet owners!`
                  );

                  this.ble.enableMonitoring();
                })
                .catch(e => {
                  this.mixpanel
                    .track('tag_attach_error', { tag: minor })
                    .then(() => {})
                    .catch(e => {
                      console.error('Mixpanel Error', e);
                    });

                  this.toast
                    .showWithOptions({
                      message: 'ERROR: Unable to attach tag',
                      duration: 3500,
                      position: 'center'
                    })
                    .subscribe(toast => {
                      console.log(JSON.stringify(toast));
                    });

                  this.ble.enableMonitoring();
                });
            }
          });
      })
      .catch(e => {
        this.mixpanel
          .track('scan_qr_error')
          .then(() => {})
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        console.error(
          'attachTag(): Unable to scan QR code: ' + JSON.stringify(e)
        );

        this.toast
          .showWithOptions({
            message: 'Could not scan code',
            duration: 1500,
            position: 'center'
          })
          .subscribe(toast => {
            console.log(JSON.stringify(toast));
          });

        this.ble.enableMonitoring();
      });
      */
  }

  getInvitesRequired() {
    if (this.invites < 3) {
      return 3 - this.invites;
    } else {
      return 0;
    }
  }

  sendInvite() {
    // Make sure we send an up-to-date FCM token with our invite
    this.notificationProvider.updateTokens();

    this.authProvider
      .getAccountInfo(false)
      .then(account => {
        this.utilsProvider
          .textReferralCode(
            account.displayName,
            account.team ? account.team : "",
            this.notificationProvider.getFCMToken()
          )
          .then(r => {
            console.log("sendInvite", r);

            // Wait for 1 second to ensure Branch updated their database
            setTimeout(() => {
              this.utilsProvider
                .getCurrentScore("invite")
                .then(s => {
                  this.invites = Number(s);
                })
                .catch(e => {
                  console.error("getCurrentScore", e);
                });
            }, 1000);
          })
          .catch(e => {
            console.warn("textReferralCode", e);
          });
      })
      .catch(e => {
        console.error("sendInvite(): ERROR: Unable to get account info!", e);
      });
  }

  openTroubleshootingPage(tagId) {
    this.mixpanel
      .track("open_troubleshooting", { tag: tagId })
      .then(() => {})
      .catch(e => {
        console.error("Mixpanel Error", e);
      });

    window.open(
      "https://huan.zendesk.com/hc/en-us/articles/360026479974-Troubleshooting",
      "_system"
    );
  }

  getListSubtitleText(tag) {
    if (tag.tagattached && !this.getTagWarnings(tag.tagId)) {
      return this.getSubtitleText(tag.tagId);
    } else if (tag.tagattached && this.getTagWarnings(tag.tagId)) {
      return "No Signal Received";
    } else if (tag.tagattached == false && tag.order_status == "none") {
      return "Tag not attached";
    } else if (tag.tagattached == false && tag.order_status != "none") {
      return "Tag order received";
    } else {
      return "";
    }
  }

  getProximity(tag) {
    switch (tag.proximity) {
      case "ProximityUnknown":
        return "Unknown";
      case "ProximityFar":
        return "Far";
      case "ProximityNear":
        return "Close";
      case "ProximityImmediate":
        return "Very close";
      default:
        return "Unknown";
    }
  }

  getBorderColor(tag) {
    var formattedTagInfo = this.getTags();

    if (!tag.tagattached) {
      return;
    }

    if (
      formattedTagInfo[tag.tagId].lastseen &&
      Date.now() - formattedTagInfo[tag.tagId].lastseen.toDate() <
        60 * 60 * 1000
    ) {
      return {
        "border-left-width": "3px",
        "border-left-color": "green",
        color: "green"
      };
    }

    if (
      formattedTagInfo[tag.tagId].lastseen &&
      Date.now() - formattedTagInfo[tag.tagId].lastseen.toDate() <
        60 * 60 * 24 * 1000
    ) {
      return {
        "border-left-width": "3px",
        "border-left-color": "orange",
        color: "orange"
      };
    }

    if (
      formattedTagInfo[tag.tagId].lastseen &&
      Date.now() - formattedTagInfo[tag.tagId].lastseen.toDate() >
        60 * 60 * 24 * 1000
    ) {
      return {
        "border-left-width": "3px",
        "border-left-color": "red",
        color: "red"
      };
    }
  }

  getTagSignalStrength(tag) {
    return 100 - Math.abs(tag.rssi);
  }

  openShop() {
    if (this.unattached_tags < 2) {
      window.open("https://gethuan.com/product/huan-tag-basic/", "_system");
    } else if (this.unattached_tags <= 3) {
      window.open(
        "https://gethuan.com/product/huan-tag-premium-3-pack/",
        "_system"
      );
    } else {
      window.open(
        "https://gethuan.com/product/huan-tag-unlimited-5-pack/",
        "_system"
      );
    }
  }

  goToSlide() {
    this.slides.lockSwipes(false);
    switch (this.list_type) {
      case "grid":
        this.slides.slideTo(1, 100);
        break;
      case "list":
        this.slides.slideTo(0, 100);
        break;
      default:
        break;
    }
    this.slides.lockSwipes(true);
  }
  refresh() {
    this.goToSlide();
    this.content.scrollTo(0, 0, 0);

    this.settingsProvider
      .setPetListMode(this.list_type)
      .then(r => {})
      .catch(e => {});
  }
}
