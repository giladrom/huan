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
    .where('lastseen', '>=', beginningDateObject)
    .get()
    .then(snapshot => {
        console.log(snapshot.size, "Tags updated last 7 days");


    })
    .catch(e => {
        console.error('error', e);
    });

beginningDate = Date.now() - (86400000 * 30);
beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection('Tags')
    .where('lastseen', '>=', beginningDateObject)
    .get()
    .then(snapshot => {
        console.log(snapshot.size, "Tags updated last 30 days");


    })
    .catch(e => {
        console.error('error', e);
    });

beginningDate = Date.now() - (86400000 * 90);
beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection('Tags')
    .where('lastseen', '>=', beginningDateObject)
    .get()
    .then(snapshot => {
        console.log(snapshot.size, "Tags updated last 90 days");


    })
    .catch(e => {
        console.error('error', e);
    });