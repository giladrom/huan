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

var beginningDate = Date.now() - (86400000 * 7);
var beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection('Tags')
    .where('added', '>=', beginningDateObject)
    .where('type', '==', 'dog')
    .get()
    .then(snapshot => {
        console.log(snapshot.size, "dogs");

        snapshot.forEach(doc => {
            var tag = doc.data();

            console.log("dog name", tag.name.toLowerCase().replace(/\s/g, ''));
        });
    })
    .catch(e => {
        console.error('error', e);
    });

admin
    .firestore()
    .collection('Tags')
    .where('added', '>=', beginningDateObject)
    .where('type', '==', 'cat')
    .get()
    .then(snapshot => {
        console.log(snapshot.size, "cats");

        snapshot.forEach(doc => {
            var tag = doc.data();

            console.log("cat name", tag.name.toLowerCase().replace(/\s/g, ''));
        });
    })
    .catch(e => {
        console.error('error', e);
    });
