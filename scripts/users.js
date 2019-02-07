const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
var total_users = 0;
var verified_users = 0;

const settings = {
  timestampsInSnapshots: true
};
db.settings(settings);

function listUser(user) {
  admin
    .firestore()
    .collection('Users')
    .doc(user)
    .get()
    .then(doc => {
      console.log(JSON.stringify(doc.data(), null, ' '));
    })
    .catch(e => {
      console.error('Unable to retrieve user: ' + e);
    });

  admin
    .firestore()
    .collection('Users')
    .doc(user)
    .collection('notifications')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
      });
    })
    .catch(e => {
      console.error('Unable to retrieve notifications: ' + e);
    });
}

function listAllUsers(nextPageToken) {
  // List batch of users, 1000 at a time.
  admin
    .auth()
    .listUsers(1000, nextPageToken)
    .then(function (listUsersResult) {
      listUsersResult.users.forEach(function (userRecord) {
        total_users++;
        if (userRecord.email !== undefined) {
          admin
            .firestore()
            .collection('Users')
            .doc(userRecord.uid)
            .get()
            .then(doc => {
              console.log(doc.data().account.displayName, userRecord.email);
            })
            .catch(e => {
              // console.error('Unable to retrieve user: ' + e);
            });
          verified_users++;
        }

        console.log(JSON.stringify(userRecord));
      });
      if (listUsersResult.pageToken) {
        // List next batch of users.
        listAllUsers(listUsersResult.pageToken);
      }

      console.log('Total users: ' + total_users);
      console.log('Verified users: ' + verified_users);
    })
    .catch(function (error) {
      console.log('Error listing users:', error);
    });
}

function fixOrderField() {
  admin
    .firestore()
    .collection('Tags')
    .where('tagId', '>=', '9000')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        var tag = doc.data();

        if (tag.order_status) {
          console.log(tag.tagId, tag.order_status)
        } else {
          console.log(tag.tagId, 'No Order Status Field, updating');

          admin
          .firestore()
          .collection('Tags')
          .doc(tag.tagId)
          .update({
            order_status: 'none'
          })
          .then(res => {
            console.log('Update successful');
          })
          .catch(err => {
            console.error('Unable to update order status: ' + JSON.stringify(err));
          });
        }
      });

    })
    .catch(e => {
      console.error('Unable to retrieve tag: ' + e);
    });
}

function listCommunities() {
  var communities = [];

  admin
    .firestore()
    .collection('Users')
    .where('settings.communityNotificationString', '>', '')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        console.log(doc.data().settings.communityNotificationString);

        var community = doc.data().settings.communityNotificationString;
        if (communities[`${community}`] === undefined) {
          communities[`${community}`] = 0;
        } else {
          communities[`${community}`] = communities[community] + 1;
        }
      });

      communities.entries(a => {
        console.log(JSON.stringify(a));
      });
    })
    .catch(e => {
      console.error('Unable to retrieve user: ' + e);
    });
}

if (process.argv.length > 2) {
  switch (process.argv[2]) {
    case 'community':
      listCommunities();
      break;
    case 'orders':
      fixOrderField();
      break;

    default:
      listUser(process.argv[2]);
      break;
  }
} else {
  listAllUsers();
}
