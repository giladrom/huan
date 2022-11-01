const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

const settings = {
    timestampsInSnapshots: true
};
db.settings(settings);

if (process.argv.length > 2) {
    admin
        .firestore()
        .collection('Tags')
        .doc(process.argv[2])
        .get()
        .then(tag => {
            // console.log("Got tag snapshot", snapshot.docs);

            console.log((tag.data()));



        })
        .catch(e => {
            console.error('Unable to retrieve tag: ' + e);
        });

}