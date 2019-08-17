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

var beginningDate = Date.now() - 2604800000; // 30 days in milliseconds
var beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection('Tags')
    .where('tagattached', '==', false)
    .where('lastseen', '<', beginningDateObject)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var tag = doc.data();

            console.log(tag.tagId, tag.lastseen.toDate());
            admin.firestore().collection('Tags').doc(tag.tagId).delete().then(() => {
                console.log('Deleted', tag.tagId);
            }).catch(e => {
                console.error('Error', e);
            })
        });

    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
