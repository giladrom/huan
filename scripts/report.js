var net = require('net');
var os = require('os');

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

db.collection('Tags')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      // console.log(doc.id, '=>', doc.data());

      var tag = doc.data();
      tags.push(tag);
      if (tag.tagattached == true) {
        // console.log(`Tag ${tag.tagId} is attached`);
        tags_attached++;
      } else {
        console.log(`Tag ${tag.tagId} is not attached. FCM: ${tag.fcm_token}`);

        // XXX TODO: Enable this to send notifications to unattached tags
        // sendNotification(
        //   tag,
        //   tag,
        //   `${tag.name}'s tag is not attached!`,
        //   'Scan the QR code on the tag using the app to attach.'
        // );
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
    console.log('Active tags: ' + tags_monitored);
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
        function: func,
        mediaUrl: tag.img
      }
    };

    console.log(
      'Sending Notifications: ' +
        JSON.stringify(payload) +
        'to ' +
        destination.fcm_token
    );

    admin
      .messaging()
      .sendToDevice(destination.fcm_token, payload, { dryRun: true })
      .then(function(response) {
        console.log('Successfully sent message:', JSON.stringify(response));
        resolve(response);
      })
      .catch(function(error) {
        console.log('Error sending message:', JSON.stringify(error));
        reject(error);
      });
  });
}
