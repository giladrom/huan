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
    .collection('Users')
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var user = doc.data();

            try {
                if (user.score.current && user.score.current > 0) {
                    console.log(doc.id, user.score.current);

                    admin
                        .firestore()
                        .collection("Users")
                        .doc(doc.id)
                        .update({
                            "score.current": 0,
                            "score.timestamp": admin.firestore.FieldValue.serverTimestamp(),
                        })
                        .then(() => {

                        })
                        .catch((err) => {
                            console.error(
                                "Unable to reset score: " + JSON.stringify(err)
                            );
                        });
                }
            } catch (e) {
                // console.error(e);
            }
        });

    })
    .catch(e => {
        console.error('Unable to retrieve user: ' + e);
    });
