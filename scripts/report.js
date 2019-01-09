var net = require('net');
var os = require('os');
var moment = require('moment');
var pt = require('promise-timeout');

const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

const settings = { timestampsInSnapshots: true };
db.settings(settings);

var tags = [];
var users = [];
var promises = [];

var tags_attached = 0;
var tags_monitored = 0;
var registered_users = 0;
var anonymous_users = 0;
var active_users = 0;
var inactive_tags = 0;

db.collection('Tags')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      var tag = doc.data();

      if (typeof tag.uid === 'string') {
        console.warn('Oudated tag, skipping', typeof tag.uid);
      }

      tags.push(tag);
      if (
        (tag.tagattached == true || tag.lastseenBy != '') &&
        typeof tag.uid === 'object'
      ) {
        // console.log(`Tag ${tag.tagId} is attached`);
        tags_attached++;

        var ls, diff, user;

        if (typeof tag.lastseen === 'string') {
          ls = moment(moment.unix(tag.lastseen / 1000));
        } else {
          ls = moment(moment.unix(tag.lastseen.toDate() / 1000));
        }

        diff = moment(moment.now()).diff(ls, 'days');
        if (diff > 5) {
          inactive_tags++;

          if (typeof tag.uid === 'object' && tag.uid !== null) {
            db.collection('Users')
              .doc(tag.uid[0])
              .get()
              .then(snapshot => {
                if (snapshot.exists) {
                  user = snapshot.data();

                  // console.log(user);

                  console.log(
                    `Tag ${
                      tag.tagId
                    } was last seen ${ls.fromNow()} (diff: ${diff}) ` +
                      (diff > 2
                        ? `[Tag is inactive: ${tag.name}/${
                            user.account.displayName
                          }/${tag.breed}/${tag.size}]`
                        : '')
                  );

                  if (diff > 2) {
                    if (typeof tag.fcm_token === 'object') {
                      sendNotification(
                        tag,
                        tag,
                        `No Signal received from ${tag.name}`,
                        'Please make sure Pet Protection is enabled!'
                      )
                        .then(r => {
                          console.log(r);
                        })
                        .catch(e => {
                          console.error(e);
                        });
                    } else {
                      console.warn('Inactive FCM token, skipping');
                    }
                  }
                }
              })
              .catch(err => {
                console.error(
                  'Error getting documents',
                  err,
                  JSON.stringify(tag)
                );
              });
          }
        }
      } else {
        if (typeof tag.fcm_token === 'object') {
          console.log(
            `[Tag ${tag.tagId} is not attached: ${tag.name}/${tag.breed}/${
              tag.size
            }]`
          );

          sendNotification(
            tag,
            tag,
            `${tag.name}'s tag is not attached!`,
            'Make sure to scan the tag inside the app.'
          )
            .then(r => {
              console.log(r);
            })
            .catch(e => {
              console.error(e);
            });
        } else {
          console.warn('Inactive FCM token, skipping');
        }
      }

      if (tag.lastseenBy != '') {
        // console.log(`Tag ${tag.tagId} monitored`);
        tags_monitored++;
      }
    });

    tags.sort((a, b) => a.id < b.id);

    // console.log(JSON.stringify(tags, null, ' '));

    console.log('Registered Pets: ' + tags.length);
    console.log('Active tags: ' + (tags_monitored - inactive_tags));
    console.log('Inactive tags: ' + inactive_tags);
  })
  .catch(err => {
    console.error('2 Error getting documents', err);
  });

db.collection('Users')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      var user = doc.data();
      users.push(user);
      if (user.signin !== 'Anonymous') {
        registered_users++;
      } else {
        anonymous_users++;
      }
    });

    console.log('Registered users: ' + registered_users);
    console.log('Anonymous users: ' + anonymous_users);
  })
  .catch(err => {
    console.log('3 Error getting documents', err);
  });

var sending = 0;
var sent = 0;
var nerror = 0;

function sendNotification(destination, tag, title, body, func = '') {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    if (destination.fcm_token === null) {
      reject('Invalid FCM token');
    }

    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        tagId: tag.tagId,
        title: title,
        body: body,
        function: func
      },
      token: destination.fcm_token[0].token
    };

    console.log('Sending Notifications: ' + JSON.stringify(message));
    sending++;

    var p = admin.messaging().send(message, false);

    pt.timeout(p, 3000)
      .then(response => {
        sent++;

        console.log(`Notifications: ${sending}/${sent}/${nerror}`);

        if (sending === sent + nerror) {
          process.exit();
        }
        resolve(response);
      })
      .catch(error => {
        nerror++;
        if (error instanceof pt.TimeoutError) {
          console.error('Timeout :-(');
        }
        reject(error);
      });
  });
}
