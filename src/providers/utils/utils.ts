import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

import moment from 'moment';

import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

import { AngularFirestore } from 'angularfire2/firestore';
import { Tag } from '../tag/tag';
import { AlertController, LoadingController, Platform } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
import { AuthProvider } from '../auth/auth';
import { LocationProvider } from '../location/location';
import firebase from 'firebase';
import { NotificationProvider } from '../notification/notification';
import { BranchIo, BranchUniversalObject } from '@ionic-native/branch-io';
import { Toast } from '@ionic-native/toast';

import { Mixpanel } from '@ionic-native/mixpanel';

@Injectable()
export class UtilsProvider implements OnDestroy {
  private subscription: any;
  alive: boolean = true;

  private loader;

  componentDestroyed$: Subject<boolean> = new Subject();

  private branch_universal_obj: BranchUniversalObject = null;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private platform: Platform,
    private appVersion: AppVersion,
    private authProvider: AuthProvider,
    private locationProvider: LocationProvider,
    private alertCtrl: AlertController,
    private notificationProvider: NotificationProvider,
    private branch: BranchIo,
    private toast: Toast,
    private mixpanel: Mixpanel
  ) { }

  displayAlert(title, message?, func?) {
    let alert = this.alertController.create({
      title: title,
      message: message,
      buttons: [
        {
          text: 'OK',
          handler: () => { if (func) { func } }
        }
      ],
      cssClass: 'alertclass'
    });

    alert.present();
  }

  presentLoading(duration) {
    let loader = this.loadingController.create({
      content: 'Please wait...',
      duration: duration
    });

    loader.present();

    return loader;
  }

  showLoading() {
    if (!this.loader) {
      this.loader = this.loadingController.create({
        content: 'Please Wait...'
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

  getLastSeen(lastseen) {
    return moment(moment.unix(lastseen / 1000)).fromNow();
  }

  pad(n, width, z): string {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  getPlatform() {
    const platform = this.platform.is('ios') ? 'iOS' : 'Android';

    return platform;
  }

  getVersion(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.appVersion
        .getVersionCode()
        .then(version => {
          resolve(version);
        })
        .catch(err => {
          console.error('Unable to retrieve Version number: ' + err);
          reject(undefined);
        });
    });
  }

  // Generate random referral code
  // Shamelessly stolen from https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript#8084248
  makeid() {
    var text = '';
    var possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  findRandomTagId(): Promise<any> {
    return new Promise((resolve, reject) => {
      let tagId = this.randomIntFromInterval(3000, 9999);

      console.log(`findRandomTagId: Checking if temporary ID ${tagId} is taken...`);

      var unsubscribe = this.afs
        .collection<Tag>('Tags')
        .doc(tagId.toString())
        .ref.onSnapshot(doc => {
          if (!doc.exists) {
            console.log(`findRandomTagId: ${tagId} is available. Proceeding...`);
            resolve(tagId);
          } else {
            console.log(`findRandomTagId: ${tagId} is taken. trying again...`);

            resolve(this.findRandomTagId());
          }

          unsubscribe();
        });
    });
  }


  generateReferralCode(token, tag = 0): Promise<any> {
    return new Promise((resolve, reject) => {
      var reportCollectionRef = this.afs.collection('Referrals');

      this.authProvider.getUserId().then(uid => {
        let code = this.makeid();

        reportCollectionRef
          .doc(code)
          .set({
            uid: uid,
            token: token,
            tag: tag,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          })
          .then(() => {
            resolve(code);
          })
          .catch(e => {
            console.error('generateReferralCode(): ' + e);
            reject(e);
          });
      });
    });
  }

  textReferralCode(name, team, token) {
    return new Promise((resolve, reject) => {
      this.mixpanel
        .track('text_referral_code')
        .then(() => { })
        .catch(e => {
          console.error('Mixpanel Error', e);
        });

      this.authProvider.getUserId().then(uid => {
        var properties = {
          canonicalIdentifier: 'huan/referral',
          contentIndexingMode: 'private',
          contentMetadata: {
            token: token,
            uid: uid,
            name: name,
            invite: true,
            team: team
          }
        };

        this.branch
          .createBranchUniversalObject(properties)
          .then(obj => {
            console.info(
              'Branch.createBranchUniversalObject',
              JSON.stringify(obj)
            );

            this.branch_universal_obj = obj;

            var analytics = {
              channel: 'app',
              feature: 'invite',
              stage: 'new user',
              // team: team
            };

            // optional fields
            var link_properties = {
              $desktop_url: 'https://gethuan.com/',
              $android_url:
                'https://play.google.com/store/apps/details?id=com.gethuan.huanapp',
              $ios_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
              $ipad_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
              $deeplink_path: 'huan/referral',
              $email_subject: 'Join my pack on Huan!',
              $match_duration: 2000,
              custom_string: 'invite',
              custom_integer: Date.now(),
              custom_boolean: true
            };

            this.branch_universal_obj
              .generateShortUrl(analytics, link_properties)
              .then(res => {
                console.info(
                  'branch_universal_obj.generateShortUrl',
                  JSON.stringify(res)
                );

                this.branch_universal_obj.onShareSheetDismissed(r => {
                  console.warn('shareSheetDismissed', r);
                  this.mixpanel
                    .track('share_sheet_dismissed')
                    .then(() => { })
                    .catch(e => {
                      console.error('Mixpanel Error', e);
                    });

                  // reject('shareSheetDismissed');
                });

                this.branch_universal_obj.onLinkShareResponse(r => {
                  console.log(JSON.stringify(r));

                  this.toast
                    .showWithOptions({
                      message: 'You just made your pets safer! Way to go!',
                      duration: 5000,
                      position: 'center'
                      // addPixelsY: 120
                    })
                    .subscribe(toast => {
                      console.log(JSON.stringify(toast));
                    });

                  this.getCurrentScore('invite')
                    .then(score => {
                      this.mixpanel
                        .track('referral_share_success', { score: score })
                        .then(() => { })
                        .catch(e => {
                          console.error('Mixpanel Error', e);
                        });

                      console.log('Invite score is now ', score);
                    })
                    .catch(e => {
                      console.error(e);
                      reject(e);
                    });

                  console.log(JSON.stringify(r));

                  this.branch
                    .userCompletedAction('invite_sent', { uid: uid })
                    .then(r => {
                      console.log(
                        'handleInvite: Registered install_sent event',
                        JSON.stringify(r)
                      );

                      resolve(r);
                    })
                    .catch(e => {
                      console.error(
                        'handleInvite: could not register install_sent event',
                        JSON.stringify(e)
                      );
                      reject(e);
                    });
                });

                if (team === 'none' || team === '') {
                  team = 'huan';
                }
                
                this.branch_universal_obj
                  .showShareSheet(
                    analytics,
                    link_properties,
                    `Join my pack on Huan! Use the link below to get a free Huan Wireless Microchip and protect your pet (and mine, too!)\n\n`
                  )
                  .then(r => {
                    console.log('Branch.showShareSheet', JSON.stringify(r));
                  })
                  .catch(e => {
                    console.error('Branch.showShareSheet', JSON.stringify(e));
                    reject(e);
                  });
              })
              .catch(e => {
                console.error(
                  'branch_universal_obj.generateShortUrl',
                  JSON.stringify(e)
                );
                reject(e);
              });
          })
          .catch(e => {
            console.error(
              'Branch.createBranchUniversalObject',
              JSON.stringify(e)
            );
            reject(e);
          });
      });
    });
  }

  textCoOwnerCode(name, token, tag) {
    this.mixpanel
      .track('text_co_owner_code')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.authProvider.getUserId().then(uid => {
      var properties = {
        canonicalIdentifier: 'huan/coowner',
        contentIndexingMode: 'private',
        contentMetadata: {
          token: token,
          uid: uid,
          name: name,
          tagId: tag.tagId,
          tagName: tag.name,
          invite: false,
          coowner: true
        }
      };

      this.branch
        .createBranchUniversalObject(properties)
        .then(obj => {
          console.info(
            'Branch.createBranchUniversalObject',
            JSON.stringify(obj)
          );

          this.branch_universal_obj = obj;

          var analytics = {
            channel: 'app',
            feature: 'coowner'
          };

          // optional fields
          var link_properties = {
            $desktop_url: 'https://gethuan.com/',
            $android_url:
              'https://play.google.com/store/apps/details?id=com.gethuan.huanapp',
            $ios_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
            $ipad_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
            $deeplink_path: 'huan/coowner',
            $match_duration: 2000,
            custom_string: 'coowner',
            custom_integer: Date.now(),
            custom_boolean: true
          };

          this.branch_universal_obj
            .generateShortUrl(analytics, link_properties)
            .then(res => {
              console.info(
                'branch_universal_obj.generateShortUrl',
                JSON.stringify(res)
              );

              this.branch_universal_obj
                .showShareSheet(
                  analytics,
                  link_properties,
                  `${name} has sent you a Huan co-owner request for ${
                  tag.name
                  }!`
                )
                .then(r => {
                  console.log('Branch.showShareSheet', JSON.stringify(r));
                })
                .catch(e => {
                  console.error('Branch.showShareSheet', JSON.stringify(e));
                });

              this.branch_universal_obj.onShareSheetDismissed(r => {
                console.warn('shareSheetDismissed', r);
                this.mixpanel
                  .track('share_sheet_dismissed')
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                // reject('shareSheetDismissed');
              });

              this.branch_universal_obj.onLinkShareResponse(r => {
                this.mixpanel
                  .track('coowner_share_success')
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                this.toast
                  .showWithOptions({
                    message: 'Request sent!',
                    duration: 5000,
                    position: 'center'
                  })
                  .subscribe(toast => {
                    console.log(JSON.stringify(toast));
                  });

                console.log(JSON.stringify(r));

                this.branch
                  .userCompletedAction('coowner_sent', { uid: uid })
                  .then(r => {
                    console.log(
                      'handleInvite: Registered coowner_sent event',
                      JSON.stringify(r)
                    );
                  })
                  .catch(e => {
                    console.error(
                      'handleInvite: could not register coowner_sent event',
                      JSON.stringify(e)
                    );
                  });
              });
            })
            .catch(e => {
              console.error(
                'branch_universal_obj.generateShortUrl',
                JSON.stringify(e)
              );
            });
        })
        .catch(e => {
          console.error(
            'Branch.createBranchUniversalObject',
            JSON.stringify(e)
          );
        });
    });
  }

  sharePet(tag) {
    this.mixpanel
      .track('share_pet')
      .then(() => { })
      .catch(e => {
        console.error('Mixpanel Error', e);
      });

    this.authProvider.getUserId().then(uid => {
      var properties = {
        canonicalIdentifier: 'huan/share_pet',
        contentIndexingMode: 'private',
        contentDescription: `${tag.name} is on Huan, and you should be too!`,
        contentImageUrl: tag.img,
        contentMetadata: {
          uid: uid,
          tagId: tag.tagId,
          tagName: tag.name,
          invite: false,
        }
      };

      this.branch
        .createBranchUniversalObject(properties)
        .then(obj => {
          console.info(
            'Branch.createBranchUniversalObject',
            JSON.stringify(obj)
          );

          this.branch_universal_obj = obj;

          var analytics = {
            channel: 'app',
            feature: 'share_pet'
          };

          // optional fields
          var link_properties = {
            $desktop_url: 'https://gethuan.com/',
            $android_url:
              'https://play.google.com/store/apps/details?id=com.gethuan.huanapp',
            $ios_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
            $ipad_url: 'itms-apps://itunes.apple.com/app/huan/id1378120050',
            $deeplink_path: 'huan/share_pet',
            $match_duration: 2000,
            custom_string: 'share_pet',
            custom_integer: Date.now(),
            custom_boolean: true
          };

          this.branch_universal_obj
            .generateShortUrl(analytics, link_properties)
            .then(res => {
              console.info(
                'branch_universal_obj.generateShortUrl',
                JSON.stringify(res)
              );

              this.branch_universal_obj
                .showShareSheet(
                  analytics,
                  link_properties,
                  `${tag.name} is on Huan, and you should be too!`
                )
                .then(r => {
                  console.log('Branch.showShareSheet', JSON.stringify(r));
                })
                .catch(e => {
                  console.error('Branch.showShareSheet', JSON.stringify(e));
                });

              this.branch_universal_obj.onShareSheetDismissed(r => {
                console.warn('shareSheetDismissed', r);
                this.mixpanel
                  .track('share_sheet_dismissed')
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                // reject('shareSheetDismissed');
              });

              this.branch_universal_obj.onLinkShareResponse(r => {
                this.mixpanel
                  .track('pet_share_success')
                  .then(() => { })
                  .catch(e => {
                    console.error('Mixpanel Error', e);
                  });

                this.toast
                  .showWithOptions({
                    message: 'Link Share Successful!',
                    duration: 2000,
                    position: 'center'
                  })
                  .subscribe(toast => {
                    console.log(JSON.stringify(toast));
                  });

                console.log(JSON.stringify(r));

                this.branch
                  .userCompletedAction('pet_share', { uid: uid, tagId: tag.tagId })
                  .then(r => {
                    console.log(
                      'sharePet: Share completed',
                      JSON.stringify(r)
                    );
                  })
                  .catch(e => {
                    console.error(
                      'sharePet',
                      JSON.stringify(e)
                    );
                  });
              });
            })
            .catch(e => {
              console.error(
                'branch_universal_obj.generateShortUrl',
                JSON.stringify(e)
              );
            });
        })
        .catch(e => {
          console.error(
            'Branch.createBranchUniversalObject',
            JSON.stringify(e)
          );
        });
    });
  }

  getCurrentScore(bucket) {
    return new Promise((resolve, reject) => {
      this.branch
        .loadRewards(bucket)
        .then(score => {
          console.log(`Branch.rewards [${bucket}]`, JSON.stringify(score));
          resolve(score);
        })
        .catch(e => {
          console.error('Branch.rewards', JSON.stringify(e));
          reject(e);
        });
    });
  }

  handleInvite(uid, token) {
    this.authProvider
      .getAccountInfo(false)
      .then(account => {
        this.mixpanel
          .track('accepted_invite')
          .then(() => { })
          .catch(e => {
            console.error('Mixpanel Error', e);
          });

        var title = `${account.displayName} has accepted your invite!`;

        var body = `Good job! Your pets are now safer.`;

        this.notificationProvider.sendRemoteNotification(title, body, token);

        this.addRemoteNotificationToDb(title, body, uid);
      })
      .catch(e => {
        console.error('handleInvite: getAccountInfo', JSON.stringify(e));
      });
  }

  /*
  handleInvite(code) {
    var reportCollectionRef = this.afs.collection('Referrals');

    reportCollectionRef
      .doc(code)
      .get()
      .subscribe(
        ref => {
          if (ref.exists) {
            var uid = ref.data().uid;
            console.log('Referral belongs to ' + uid);

            this.authProvider.getUserId().then(my_uid => {
              if (my_uid === uid) {
                console.log('Sent an invite to ourselves, not cool!');

                reportCollectionRef
                  .doc(code)
                  .delete()
                  .then(() => {
                    console.log('Removed referral code', code);
                  })
                  .catch(e => {
                    console.error('Unable to remove referral code', code, e);
                  });
              } else {
                var scoreRef = this.afs.collection('Score');
                var notify = false;

                try {
                  scoreRef
                    .doc(uid)
                    .get()
                    .subscribe(
                      score => {
                        if (score.exists) {
                          var friends: Array<any> = score.data().friends;

                          if (friends.indexOf(my_uid) !== -1) {
                            console.warn(
                              'Friend list already contains me, ignoring'
                            );
                          } else {
                            friends.push(my_uid);
                            var count = score.data().count + 1;

                            scoreRef
                              .doc(uid)
                              .update({
                                count: count,
                                friends: friends,
                                timestamp: firebase.firestore.FieldValue.serverTimestamp()
                              })
                              .then(() => {
                                console.log(
                                  'Updated referral count for ' +
                                    uid +
                                    ' to ' +
                                    count
                                );
                              })
                              .catch(e => {
                                console.error(
                                  'Unable to update referral count',
                                  e
                                );
                              });

                            notify = true;
                          }
                        } else {
                          console.log('Initializing referral count for ' + uid);
                          scoreRef
                            .doc(uid)
                            .set({
                              count: 1,
                              friends: [my_uid],
                              timestamp: firebase.firestore.FieldValue.serverTimestamp()
                            })
                            .then(() => {
                              console.log(
                                'Initialized referral count for ' + uid
                              );
                            })
                            .catch(e => {
                              console.error(
                                'Unable to initialize referral count',
                                e
                              );
                            });

                          notify = true;
                        }

                        if (notify) {
                          this.authProvider
                            .getAccountInfo(false)
                            .then(account => {
                              var title = `${
                                account.displayName
                              } has accepted your invite!`;

                              var body = `Good job! Your pets are now safer.`;

                              this.notificationProvider.sendRemoteNotification(
                                title,
                                body,
                                ref.data().token
                              );

                              this.addRemoteNotificationToDb(title, body, uid);
                            });
                        }

                        reportCollectionRef
                          .doc(code)
                          .delete()
                          .then(() => {
                            console.log('Removed referral code', code);
                          })
                          .catch(e => {
                            console.error(
                              'Unable to remove referral code',
                              code,
                              e
                            );
                          });
                      },
                      err => {
                        console.error('Unable to get score counter', err);
                      }
                    );
                } catch (e) {
                  console.error(e);
                }
              }
            });
          } else {
            this.displayAlert(
              'Invalid Referral code',
              'This invitation was already used - please ask for a new one.'
            );
          }
        },
        error => {
          console.error(error);
        }
      );
  }
  */

  addRemoteNotificationToDb(title, body, uid) {
    this.afs
      .collection('Users')
      .doc(uid)
      .collection('notifications')
      .doc(Date.now().toString())
      .set({
        payload: {
          notification: {
            title: title,
            body: body,
            sound: 'default',
            clickAction: 'FCM_PLUGIN_ACTIVITY',
            icon: 'fcm_push_icon'
          },
          data: {
            title: title,
            body: body,
            function: ''
          }
        }
      })
      .then(res => { })
      .catch(err => {
        console.error(
          'Unable to update notification in DB: ' + JSON.stringify(err)
        );
      });
  }

  handleCoOwner(uid, token, name, tagId, tagName) {
    this.authProvider
      .getUserId()
      .then(my_uid => {
        this.addCoOwnerToTag(tagId, my_uid)
          .then(() => {
            this.mixpanel
              .track('add_co_owner_to_tag', { tag: tagId })
              .then(() => { })
              .catch(e => {
                console.error('Mixpanel Error', e);
              });

            this.authProvider
              .getAccountInfo(false)
              .then(account => {
                var title = `${account.displayName} has accepted your request`;
                var body = `They are now ${tagName}'s co-owner!`;

                this.notificationProvider.sendRemoteNotification(
                  title,
                  body,
                  token
                );

                this.addRemoteNotificationToDb(title, body, uid);

                this.branch
                  .userCompletedAction('coowner_add', {
                    name: account.displayName
                  })
                  .then(r => {
                    console.log(
                      'handleInvite: Registered coowner_add event',
                      JSON.stringify(r)
                    );
                  })
                  .catch(e => {
                    console.error(
                      'handleInvite: could not register coowner_add event',
                      JSON.stringify(e)
                    );
                  });
              })
              .catch(e => {
                console.error(
                  'handleInvite: getAccountInfo',
                  JSON.stringify(e)
                );
              });
          })
          .catch(e => {
            console.error(e);
          });
      })
      .catch(e => {
        console.error(e);
      });

    /*    
    var reportCollectionRef = this.afs.collection('Referrals');

    reportCollectionRef
      .doc(code)
      .get()
      .subscribe(
        ref => {
          if (ref.exists) {
            var uid = ref.data().uid;
            console.log('Referral belongs to ' + uid);

            this.authProvider.getUserId().then(my_uid => {
              if (my_uid === uid) {
                console.log('Sent an invite to ourselves, not cool!');

                reportCollectionRef
                  .doc(code)
                  .delete()
                  .then(() => {
                    console.log('Removed referral code', code);
                  })
                  .catch(e => {
                    console.error('Unable to remove referral code', code, e);
                  });
              } else {
                var scoreRef = this.afs.collection('Score');
                var notify = false;

                try {
                  this.addCoOwnerToTag(ref.data().tag, my_uid)
                    .then(() => {
                      this.authProvider.getAccountInfo(false).then(account => {
                        var title = `${
                          account.displayName
                        } has accepted your invite!`;
                        var body = `They are now a co-owner.`;
                        this.notificationProvider.sendRemoteNotification(
                          title,
                          body,
                          ref.data().token
                        );

                        this.addRemoteNotificationToDb(title, body, uid);
                      });
                    })
                    .catch(e => {
                      console.error(e);
                    });

                  reportCollectionRef
                    .doc(code)
                    .delete()
                    .then(() => {
                      console.log('Removed referral code', code);
                    })
                    .catch(e => {
                      console.error('Unable to remove referral code', code, e);
                    });
                } catch (e) {
                  console.error(e);
                }
              }
            });
          } else {
            this.displayAlert(
              'Invalid Referral code',
              'This invitation was already used - please ask for a new one.'
            );
          }
        },
        error => {
          console.error(error);
        }
      );
      */
  }

  /*
  processReferralCode(path: String) {
    let task = path.split('/');

    console.log('Received referral code', task[3]);

    switch (task[2]) {
      case 'invite':
        this.handleInvite(task[3]);
        break;
      case 'co-owner':
        this.handleCoOwner(task[3]);
        break;
    }
  }
  */

  subscriptionToString(subscription) {
    return `
    E-Mail: ${subscription.email}

    ${subscription.name}
    ${subscription.address1}
    ${subscription.city}, ${subscription.state} ${subscription.zipcode}
    
    Tags: ${subscription.amount}
    
    `;
    // Subscription Type: ${subscription.subscription_type}
    // Start date: ${subscription.start_date}`;
  }

  sendReport(report) {
    var reportCollectionRef = this.afs.collection('Reports');

    var report_description;

    switch (report) {
      case 'police':
        report_description =
          'A Leash Alert notifies your community to keep their dogs on leash.';
        break;

      case 'pet_friendly':
        report_description =
          'This report marks your current location as pet friendly, so other pet owners know they can bring their pets along.';
        break;

      case 'crowded':
        report_description =
          'This report marks your current location as crowded, so other pet owners might wish to avoid it.';
        break;

      case 'hazard':
        report_description =
          'This report marks your current location as hazardous, so that other pet owners can avoid it.';
        break;
    }

    let confirm = this.alertCtrl.create({
      title: 'Send community report',
      message:
        report_description +
        '\n\nEveryone in your community will be notified. Are you sure?',
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'Send Report',
          handler: () => {
            var locationStr = '';

            this.authProvider.getUserId().then(uid => {
              this.locationProvider
                .getLocation()
                .then(loc => {
                  var timestamp = Date.now();

                  reportCollectionRef
                    .doc(timestamp.toString())
                    .set({
                      report: report,
                      uid: uid,
                      location: loc,
                      timestamp: timestamp
                    })
                    .catch(e => {
                      console.error('sendReport: ' + e);
                    });
                })
                .catch(e => {
                  console.error('sendReport(): ' + JSON.stringify(e));
                });
            });
          }
        }
      ],
      cssClass: 'alertclass'
    });

    confirm.present();
  }

  async createSupportTicket(name, email, subject, body): Promise<any> {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    const platform = this.getPlatform();
    const version = await this.getVersion();

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post(
            'https://huan.zendesk.com/api/v2/requests.json',
            {
              request: {
                requester: {
                  name: name !== null ? name : 'Anonymous',
                  email: email
                },
                subject: subject,
                comment: {
                  body:
                    JSON.stringify(body) +
                    `\n\n\nUser ID: ${
                    user.uid
                    }\nPlatform: ${platform}\nVersion: ${version}`
                }
              }
            },
            httpHeaders
          )
          .subscribe(
            data => {
              resolve(data);
              console.log('Success: ' + JSON.stringify(data));
            },
            error => {
              reject(error);
              console.error('Error: ' + JSON.stringify(error));
            }
          );
      });
    });
  }

  createShippoOrder(to_address, from_address, items, order_id): Promise<any> {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization:
          'ShippoToken shippo_live_984e8c408cb8673dc9e1532e251f5ff12ca8ce60'
      })
    };

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post(
            'https://api.goshippo.com/orders/',
            {
              order_number: order_id,
              to_address: to_address,
              from_address: from_address,
              line_items: items,
              placed_at: moment().format(),
              order_status: 'PAID',
              shipping_cost: '2.66',
              shipping_cost_currency: 'USD',
              shipping_method: 'USPS First Class Package',
              subtotal_price: '0',
              total_price: '0',
              total_tax: '0.00',
              currency: 'USD',
              weight: '0.10',
              weight_unit: 'lb'
            },
            httpHeaders
          )
          .subscribe(
            data => {
              resolve(data);
            },
            error => {
              reject(error);
            }
          );
      });
    });
  }

  createStripeCharge(customer, amount, description, token): Promise<any> {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post(
            'https://s.gethuan.com:56970/charge',
            {
              customer: customer,
              amount: amount * 100,
              description: description,
              token: token
            },
            httpHeaders
          )
          .subscribe(
            data => {
              console.log('stripe', JSON.stringify(data));
              resolve(data);
            },
            error => {
              console.error('stripe', JSON.stringify(error));

              reject(error);
            }
          );
      });
    });
  }

  createStripeOrder(customer, coupon = null, items): Promise<any> {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };

    return new Promise<any>((resolve, reject) => {
      var order_obj: any = {
        customer: customer,
        items: items
      };

      if (coupon) {
        order_obj.coupon = coupon;
      }

      this.authProvider.getUserInfo().then(user => {
        this.http
          .post('https://s.gethuan.com:56970/order', order_obj, httpHeaders)
          .subscribe(
            data => {
              if (!data) {
                reject(data);
              }

              console.log('stripe', JSON.stringify(data));
              resolve(data);
            },
            error => {
              console.error('stripe', JSON.stringify(error));

              reject(error);
            }
          );
      });
    });
  }

  getStripeProductList() {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post('https://s.gethuan.com:56970/products', {}, httpHeaders)
          .subscribe(
            data => {
              resolve(data);
            },
            error => {
              reject(error);
            }
          );
      });
    });
  }

  getStripeProduct(product) {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post(
            'https://s.gethuan.com:56970/product',
            { product: product },
            httpHeaders
          )
          .subscribe(
            data => {
              resolve(data);
            },
            error => {
              reject(error);
            }
          );
      });
    });
  }

  getStripeSKUList() {
    const httpHeaders = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };

    return new Promise<any>((resolve, reject) => {
      this.authProvider.getUserInfo().then(user => {
        this.http
          .post('https://s.gethuan.com:56970/sku', {}, httpHeaders)
          .subscribe(
            data => {
              resolve(data);
            },
            error => {
              reject(error);
            }
          );
      });
    });
  }

  randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Calculate geographical distance between two GPS coordinates
  // Shamelessly stolen from https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
  degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
    var earthRadiusKm = 6371;

    var dLat = this.degreesToRadians(lat2 - lat1);
    var dLon = this.degreesToRadians(lon2 - lon1);

    var _lat1 = this.degreesToRadians(lat1);
    var _lat2 = this.degreesToRadians(lat2);

    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(_lat1) *
      Math.cos(_lat2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  distanceInMeters(location1, location2) {
    if (location1 !== undefined && location2 !== undefined) {
      var loc1 = location1.split(',');
      var loc2 = location2.split(',');

      return (
        this.distanceInKmBetweenEarthCoordinates(
          loc1[0],
          loc1[1],
          loc2[0],
          loc2[1]
        ) * 1000
      );
    } else {
      return -1;
    }
  }

  getTag(tagId): Promise<Tag> {
    return new Promise<Tag>((resolve, reject) => {
      var tagCollectionRef = this.afs.collection<Tag>('Tags');
      var paddedId = this.pad(tagId, 4, '0');

      tagCollectionRef
        .doc(paddedId)
        .ref.get()
        .then(data => {
          var tag: Tag = <Tag>data.data();

          resolve(tag);
        })
        .catch(e => {
          console.error('Tag ID ' + paddedId + ' missing from Database');
          reject(e);
        });
    });
  }

  addCoOwnerToTag(tagId, uid): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getTag(tagId)
        .then(tag => {
          if (tag.uid.indexOf(uid) === -1) {
            console.log(`Adding ${uid} as co-owner of tag ${tag.tagId}`);

            tag.uid.push(uid);

            var tagCollectionRef = this.afs.collection<Tag>('Tags');

            tagCollectionRef
              .doc(this.pad(tagId, 4, '0'))
              .update({ uid: tag.uid })
              .then(() => {
                resolve(true);
              })
              .catch(e => {
                console.error('addCoOwnerToTag(): update: ' + e);
                reject(e);
              });
          } else {
            console.warn(`addCoOwnerToTag: ${uid} is already a co-owner`);
            reject(`addCoOwnerToTag: ${uid} is already a co-owner`);
          }
        })
        .catch(e => {
          console.error('addCoOwnerToTag(): ' + e);
          reject(e);
        });
    });
  }
}
