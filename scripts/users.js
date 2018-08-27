const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
var total_users = 0;
var verified_users = 0;

const settings = { timestampsInSnapshots: true };
db.settings(settings);

function listUser(user) {
  admin
    .firestore()
    .collection('Users')
    .doc(user)
    .get()
    .then(doc => {
      console.log(JSON.stringify(doc.data(), null, ' '));

      const settings = doc.data().settings;
      const account = doc.data().account;
    })
    .catch(e => {
      console.error('Unable to retrieve user: ' + e);
    });
}

function listAllUsers(nextPageToken) {
  // List batch of users, 1000 at a time.
  admin
    .auth()
    .listUsers(1000, nextPageToken)
    .then(function(listUsersResult) {
      listUsersResult.users.forEach(function(userRecord) {
        // console.log('user', userRecord.toJSON());
        total_users++;
        if (userRecord.email !== undefined) {
          verified_users++;
        }
      });
      if (listUsersResult.pageToken) {
        // List next batch of users.
        listAllUsers(listUsersResult.pageToken);
      }

      console.log('Total users: ' + total_users);
      console.log('Verified users: ' + verified_users);
    })
    .catch(function(error) {
      console.log('Error listing users:', error);
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
    default:
      listUser(process.argv[2]);
      break;
  }
} else {
  listAllUsers();
}
