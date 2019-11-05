import {
  throwError as observableThrowError,
  ReplaySubject,
  Subscription,
  Observable
} from 'rxjs';

import {
  retry,
  catchError,
  takeUntil,
  map,
  throttleTime
} from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';

import { AngularFirestore } from '@angular/fire/firestore';

import { FCM } from '@ionic-native/fcm';
import { Platform } from 'ionic-angular';
import { UtilsProvider } from '../utils/utils';
import { LocationProvider } from '../location/location';
import { NotificationProvider } from '../notification/notification';
import { AuthProvider } from '../auth/auth';
import { BehaviorSubject } from '../../../node_modules/rxjs/BehaviorSubject';
import { AppModule } from '../../app/app.module';

import { Badge } from '@ionic-native/badge';
import firebase from 'firebase';

export interface Tag {
  id?: string;
  name: string;
  tagId: string;
  breed: any;
  color: any;
  gender: string;
  character: string;
  remarks: string;
  weight: string;
  size: string;
  location: string;
  img: string;
  lastseen: any;
  lastseenBy: string;
  active: boolean;
  lost: boolean;
  markedlost: string;
  markedfound: string;
  uid: any;
  fcm_token?: any;
  hw: {
    batt: string;
  };
  tagattached: boolean;
  order_status?: any;
  tag_color?: any;
  tag_type?: any;
  high_risk?: boolean;
  added?: any;
  activated?: any;
  type?: any;
}

@Injectable()
export class TagProvider implements OnDestroy {
  private notified = {};

  private fcm_subscription: Subscription = new Subscription();
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  tags$: Observable<Tag[]>;
  tag_warnings$: BehaviorSubject<Number> = new BehaviorSubject<Number>(0);

  private fur_colors = new Array(
    'Dappled',
    'Piebald',
    'Yellow',
    'Brown',
    'White',
    'Grey',
    'Black',
    'Cream',
    'Tan',
    'Brindle',
    'Red',
    'Gold',
    'Blue',
    'Bicolor',
    'Tricolor',
    'Merle',
    'Tuxedo',
    'Harlequin',
    'Spotted',
    'Flecked',
    'Saddle',
    'Sable'
  );

  private cat_breeds = new Array(
    'Mixed Cat breed',
    'Abyssinian',
    'Burmese',
    'Egyptian Mau',
    'Himalayan',
    'Maine Coon',
    'Manx',
    'Persian',
    'Cornish Rex',
    'Devon Rex',
    'Russian Blue',
    'Siamese',
    'Tabby'
  );

  private dog_breeds = new Array(
    'Mixed Dog breed',
    'Affenpinscher',
    'Afghan Hound',
    'Airedale Terrier',
    'Akita',
    'Alaskan Malamute',
    'American Cocker Spaniel',
    'American Eskimo Dog (Miniature)',
    'American Eskimo Dog (Standard)',
    'American Eskimo Dog (Toy)',
    'American Foxhound',
    'American Staffordshire Terrier',
    'American Water Spaniel',
    'Anatolian Shepherd',
    'Australian Cattle Dog',
    'Australian Shepherd',
    'Australian Terrier',
    'Basenji',
    'Basset Hound',
    'Beagle',
    'Bearded Collie',
    'Beauceron',
    'Bedlington Terrier',
    'Belgian Malinois',
    'Belgian Sheepdog',
    'Belgian Tervuren',
    'Bernese Mountain Dog',
    'Bichon Frise',
    'Black Russian Terrier',
    'Black and Tan Coonhound',
    'Bloodhound',
    'Border Collie',
    'Border Terrier',
    'Borzoi',
    'Boston Terrier',
    'Bouvier des Flandres',
    'Boxer',
    'Briard',
    'Brittany',
    'Brussels Griffon',
    'Bull Terrier',
    'Bulldog',
    'Bullmastiff',
    'Cairn Terrier',
    'Canaan Dog',
    'Cardigan Welsh Corgi',
    'Cavalier King Charles Spaniel',
    'Catahoula Leopard Dog',
    'Chesapeake Bay Retriever',
    'Chihuahua',
    'Chinese Crested Dog',
    'Chinese Shar-Pei',
    'Chow Chow',
    'Clumber Spaniel',
    'Collie',
    'Curly-Coated Retriever',
    'Dachshund (Miniature)',
    'Dachshund (Standard)',
    'Dalmatian',
    'Dandie Dinmont Terrier',
    'Doberman Pinscher',
    'English Cocker Spaniel',
    'English Foxhound',
    'English Setter',
    'English Springer Spaniel',
    'English Toy Spaniel',
    'Field Spaniel',
    'Finnish Spitz',
    'Flat-Coated Retriever',
    'French Bulldog',
    'German Pinscher',
    'German Shepherd Dog',
    'German Shorthaired Pointer',
    'German Wirehaired Pointer',
    'Giant Schnauzer',
    'Glen of Imaal Terrier',
    'Golden Retriever',
    'Gordon Setter',
    'Great Dane',
    'Great Pyrenees',
    'Greater Swiss Mountain Dog',
    'Greyhound',
    'Harrier',
    'Havanese',
    'Ibizan Hound',
    'Irish Setter',
    'Irish Terrier',
    'Irish Water Spaniel',
    'Irish Wolfhound',
    'Italian Greyhound',
    'Jack Russel Terrier',
    'Japanese Chin',
    'Keeshond',
    'Kerry Blue Terrier',
    'Komondor',
    'Korean Jindo',
    'Kuvasz',
    'Labrador Retriever',
    'Lakeland Terrier',
    'Lhasa Apso',
    'Lowchen',
    'Maltese',
    'Manchester Terrier (Standard)',
    'Manchester Terrier (Toy)',
    'Mastiff',
    'Miniature Bull Terrier',
    'Miniature Pinscher',
    'Miniature Schnauzer',
    'Neapolitan Mastiff',
    'Newfoundland',
    'Norfolk Terrier',
    'Norwegian Elkhound',
    'Norwich Terrier',
    'Nova Scotia Duck Tolling Retriever',
    'Old English Sheepdog',
    'Otterhound',
    'Papillon',
    'Parson Russell Terrier',
    'Pekingese',
    'Pembroke Welsh Corgi',
    'Petit Basset Griffon Vendeen',
    'Pharaoh Hound',
    'Pit Bull',
    'Plott',
    'Pointer',
    'Polish Lowland Sheepdog',
    'Pomeranian',
    'Poodle (Miniature)',
    'Poodle (Standard)',
    'Poodle (Toy)',
    'Portuguese Water Dog',
    'Pug',
    'Puli',
    'Redbone Coonhound',
    'Rhodesian Ridgeback',
    'Rottweiler',
    'Saint Bernard',
    'Saluki (or Gazelle Hound)',
    'Samoyed',
    'Schipperke',
    'Scottish Deerhound',
    'Scottish Terrier',
    'Sealyham Terrier',
    'Shetland Sheepdog',
    'Shiba Inu',
    'Shih Tzu',
    'Siberian Husky',
    'Silky Terrier',
    'Skye Terrier',
    'Smooth Fox Terrier',
    'Soft Coated Wheaten Terrier',
    'Spinone Italiano',
    'Staffordshire Bull Terrier',
    'Standard Schnauzer',
    'Sussex Spaniel',
    'Terrier',
    'Tibetan Mastiff',
    'Tibetan Spaniel',
    'Tibetan Terrier',
    'Toy Fox Terrier',
    'Vizsla',
    'Weimaraner',
    'Welsh Springer Spaniel',
    'Welsh Terrier',
    'West Highland White Terrier',
    'Whippet',
    'Wire Fox Terrier',
    'Wirehaired Pointing Griffon',
    'Yorkshire Terrier'
  );

  private characters = new Array(
    'Friendly',
    'Nervous',
    'Timid',
    'Aggressive',
    'Shy',
    'Playful'
  );

  private fcm;

  constructor(
    public http: HttpClient,
    private afs: AngularFirestore,
    private platform: Platform,
    private utils: UtilsProvider,
    private loc: LocationProvider,
    private notification: NotificationProvider,
    private authProvider: AuthProvider,
    private badge: Badge
  ) {}

  init() {
    console.log('TagProvider: Initializing...');

    this.platform.ready().then(() => {
      this.fcm = AppModule.injector.get(FCM);
      this.badge.clear();

      this.fcm_subscription = this.fcm
        .onTokenRefresh()
        .pipe(takeUntil(this.destroyed$))
        .subscribe(token => {
          this.notification.updateTagFCMTokens(token);
        });

      this.updateTagsToArray();

      // Wait before monitoring tags to make sure all required providers have initialized
      setTimeout(() => {
        this.monitorTags();
      }, 1000);
    });
  }

  getCatBreeds() {
    return this.cat_breeds.sort();
  }

  getDogBreeds() {
    return this.dog_breeds.sort();
  }

  getFurColors() {
    return this.fur_colors.sort();
  }

  getCharacters() {
    return this.characters.sort();
  }

  // Convert single owner tags to multiple owners by replacing owner string with an array
  updateTagsToArray() {
    this.authProvider.getUserId().then(uid => {
      const snapshotSubscription = this.afs
        .collection<Tag>('Tags')
        .ref.where('uid', '==', uid)
        .orderBy('lastseen', 'desc')
        .onSnapshot(
          data => {
            var tagInfo = data.docs;

            tagInfo.forEach(t => {
              const tag = t.data();

              console.log(
                `updateTagsArray(): converting ${tag.tagId} : ${tag.uid}`
              );

              const uidArray = [tag.uid];

              this.afs
                .collection<Tag>('Tags')
                .doc(tag.tagId)
                .update({ uid: uidArray })
                .then(() => {
                  console.info('Successfully updated tag ' + tag.tagId);
                })
                .catch(e => {
                  console.error(
                    'Unable to update tag ' +
                      tag.tagId +
                      ': ' +
                      JSON.stringify(e)
                  );
                });
            });

            snapshotSubscription();
          },
          error => {
            snapshotSubscription();

            console.error(
              'updateTagsToArray(): onSnapshot Error: ' + JSON.stringify(error)
            );
          }
        );
    });
  }

  monitorTags() {
    console.log('TagProvider: Monitoring initialized');

    this.authProvider
      .getUserId()
      .then(uid => {
        this.afs
          .collection<Tag>('Tags', ref =>
            ref.where('uid', 'array-contains', uid).orderBy('tagId', 'desc')
          )
          .snapshotChanges()
          .pipe(
            catchError(error => observableThrowError(error)),
            retry(2),
            takeUntil(this.destroyed$),
            throttleTime(3000),
            map(actions =>
              actions.map(a => {
                const data = a.payload.doc.data({
                  serverTimestamps: 'previous'
                }) as Tag;
                const id = a.payload.doc.id;
                return { id, ...data };
              })
            )
          )
          .subscribe(tags => {
            var warnings = 0;

            tags.forEach(
              tag => {
                try {
                  var ls: number = Number(tag.lastseen.toDate());

                  if (Date.now() - ls > 60 * 60 * 24 * 1000) {
                    warnings++;
                  }

                  if (tag.tagattached === false) {
                    warnings++;
                  }
                } catch (e) {
                  console.error('monitorTags: ' + JSON.stringify(e));
                }
              },
              error => {
                console.error('monitorTags(): ' + JSON.stringify(error));
              }
            );

            // Set application icon badge
            this.badge.set(warnings).catch(e => {
              console.error('Unable to set badge: ' + e);
            });

            this.tag_warnings$.next(warnings);
          });
      })
      .catch(e => {
        console.error(
          'TagProvider: monitorTags: Unable to get User ID: ' +
            JSON.stringify(e)
        );
      });
  }

  getTagWarnings() {
    return this.tag_warnings$;
  }

  stop() {
    console.log('TagProvider: Shutting Down...');

    this.destroyed$.next(true);
    this.destroyed$.complete();

    this.tag_warnings$.complete();
    this.fcm_subscription.unsubscribe();
  }
  ngOnDestroy() {
    this.stop();
  }

  notifyIfLost(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var paddedId = this.utils.pad(tagId, 4, '0');

    var lost: boolean;

    tagCollectionRef
      .doc(paddedId)
      .ref.get()
      .then(data => {
        lost = Boolean(data.get('lost'));

        // If found dog is marked as lost, send a notification
        if (lost == true && this.notified[tagId] != 'true') {
          // Alert local app that a lost pet was seen nearby
          this.notification.sendLocalFoundNotification(data.get('tagId'));

          // Alert remote app that lost pet has been located
          this.authProvider.getUserId().then(uid => {
            this.notification.sendRemoteFoundNotification(
              data.get('name'),
              uid,
              data.get('tagId'),
              data.get('fcm_token')
            );
          });
        }
      })
      .catch(() => {
        console.error('Tag ID ' + paddedId + ' missing from Database');
      });
  }

  updateTagLastSeen(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    // var utc = Date.now().toString();

    const utc = firebase.firestore.FieldValue.serverTimestamp();

    tagCollectionRef
      .doc(this.utils.pad(tagId, 4, '0'))
      .update({ lastseen: utc })
      .catch(() => {
        console.error(
          'Tag ID ' + this.utils.pad(tagId, 4, '0') + ' missing from Database'
        );
      });
  }

  updateTagLocation(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc.getLocation().then(res => {
      locationStr = String(res);

      var paddedId = this.utils.pad(tagId, 4, '0');

      tagCollectionRef
        .doc(paddedId)
        .update({ location: locationStr })
        .catch(() => {
          console.error('Tag ID ' + paddedId + ' missing from Database');
        });
    });
  }

  updateTagColor(tag, color) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc.getLocation().then(res => {
      locationStr = String(res);

      tagCollectionRef
        .doc(tag.tagId)
        .update({ tag_color: color })
        .catch(() => {
          console.error('Tag ID ' + tag.tagId + ' missing from Database');
        });
    });
  }

  updateTagType(tag, type) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    var locationStr = '';
    this.loc.getLocation().then(res => {
      locationStr = String(res);

      tagCollectionRef
        .doc(tag.tagId)
        .update({ tag_type: type })
        .then(() => {
          this.updateTagColor(tag, '');
        })
        .catch(() => {
          console.error('Tag ID ' + tag.tagId + ' missing from Database');
        });
    });
  }

  updateTagBattery(tagId, batt) {
    var tagCollectionRef = this.afs.collection<Tag>('Tags');

    tagCollectionRef
      .doc(tagId)
      .update({
        'hw.batt': batt,
        'hw.timestamp': firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch(() => {
        console.error(
          'updateTagBattery(): Tag ID ' + tagId + ' missing from Database'
        );
      });
  }

  updateTagData(tag_data): Promise<any> {
    return new Promise((resolve, reject) => {
      var paddedId = this.utils.pad(tag_data.minor, 4, '0');

      var locationStr = '';
      this.loc
        .getLocation()
        .then(res => {
          locationStr = String(res);

          var utc = Date.now().toString();

          this.authProvider
            .getUserId()
            .then(
              uid => {
                try {
                  this.afs
                    .collection('Tags')
                    .doc(paddedId)
                    .update({
                      location: locationStr,
                      lastseen: firebase.firestore.FieldValue.serverTimestamp(),
                      lastseenBy: uid,
                      accuracy: tag_data.accuracy,
                      proximity: tag_data.proximity,
                      rssi: tag_data.rssi
                    })
                    .then(() => {
                      resolve(true);
                    })
                    .catch(error => {
                      // console.error(
                      //   'updateTagData:  Unable to update Tag ' +
                      //     paddedId +
                      //     ': utc: ' +
                      //     utc +
                      //     ' ' +
                      //     error
                      // );

                      reject(error);
                    });
                } catch (e) {
                  console.error('updateTagData: ERROR:  ' + e);
                }
              },
              err => {
                console.error('updateTagData: getUserId(): ' + err);
              }
            )
            .catch(e => {
              console.error('updateTagData: Unable to get user info: ' + e);
            });
        })
        .catch(error => {
          console.error('updateTagData: Unable to get location: ' + error);

          reject(error);
        });
    });
  }
}
