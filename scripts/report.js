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
