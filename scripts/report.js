var net = require('net');
var os = require('os');
var moment = require('moment');

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
      // console.log(doc.id, '=>', doc.data());

      var tag = doc.data();
      tags.push(tag);
      if (tag.tagattached == true || tag.lastseenBy != '') {
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
                }
              }
            })
            .catch(err => {
              console.log('Error getting documents', err);
            });
        }
      } else {
        // console.log(`Tag ${tag.tagId} is not attached. FCM: ${tag.fcm_token}`);
        // XXX TODO: Enable this to send notifications to unattached tags
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

        // XXX TODO:
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
    console.log('Error getting documents', err);
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

    // console.log(JSON.stringify(tags, null, ' '));

    console.log('Registered users: ' + registered_users);
    console.log('Anonymous users: ' + anonymous_users);
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });

function sendNotification(destination, tag, title, body, func = '') {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    const payload = {
      notification: {
        title: title,
        body: body,
        sound: 'default',
        clickAction: 'FCM_PLUGIN_ACTIVITY',
        icon: 'fcm_push_icon'
      },
      data: {
        tagId: tag.tagId,
        title: title,
        body: body,
        function: func
      }
    };

    console.log(
      'Sending Notifications: ' +
        JSON.stringify(payload) +
        'to ' +
        JSON.stringify(destination.fcm_token[0].token)
    );

    admin
      .messaging()
      .sendToDevice(destination.fcm_token[0].token, payload, { dryRun: false })
      .then(function(response) {
        resolve(response);
      })
      .catch(function(error) {
        reject(error);
      });
  });
}
