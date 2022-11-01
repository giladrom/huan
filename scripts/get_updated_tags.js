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
    .where('tagattached', '==', true)
    .where('lastseen', '>', beginningDateObject)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var tag = doc.data();

            db.collection("Users")
                .doc(tag.uid[0])
                .get()
                .then((snapshot) => {
                    if (snapshot.exists) {
                        user = snapshot.data();
                        if (user.account.email != undefined) {
                            if (user.account.displayName == null) {
                                console.log(user.account.email, ",", "friend");
                            } else {
                                console.log(user.account.email, ",", user.account.displayName);
                            }
                        }
                    }
                });
        });

    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
