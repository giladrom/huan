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
    .get()
    .then(snapshot => {
        // console.log("Added", snapshot.size);

        snapshot.forEach(doc => {
            var tag = doc.data();

            if (!tag.img.includes("App_Assets")) {
                process.stdout.write(` \"${tag.img}\" -O tmp/\"${tag.name}\"\n`);
            }

        });

    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
