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

var beginningDate = Date.now() - 3600000;
var beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection('Tags')
    .where('tagattached', '==', true)
    .where('lastseen', '>', beginningDateObject)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var tag = doc.data();

            console.log(tag.tagId, tag.lastseen.toDate());
        });

    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
