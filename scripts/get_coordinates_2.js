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

admin
    .firestore()
    .collection("Coords")
    .get()
    .then((querySnapshot) => {
        let itemsProcessed = 0;

        console.log("Processing", querySnapshot.size, "items");
    })
    .catch((e) => {
        console.error(e);
    });