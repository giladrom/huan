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


var orig_id = '2080';
var new_id = '4661';

admin
    .firestore()
    .collection('Tags')
    .where('tagId', '==', orig_id)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var tag = doc.data();

            tag.tagId = new_id;
            tag.tagattached = true;

            admin.firestore().collection('Tags').doc(new_id).set(tag).then(() => {
                console.log("Added new entry", tag.tagId);

                admin.firestore().collection('Tags').doc(orig_id).delete().then(() => {
                    console.log('Successfully replaced', orig_id, tag.tagId);
                }).catch(e => {
                    console.error("Unable to delete", orig_id, e);
                });
            }).catch(e => {
                console.error('Error adding new tag', new_id, e);
            })
        });

    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
