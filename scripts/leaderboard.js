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
    .where('score.current', '>', 0)
    .orderBy('score.current', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            var user = doc.data();

            var name;

            try {
                var names = user.account.displayName.split(' ');

                if (names.length > 1) {
                    var lastname = names[1].charAt(0);
                    name = `${names[0]} ${lastname}.`;
                } else {
                    name = names[0];
                }
            } catch (e) {
                name = 'Anonymous';
            }
            console.log(name, user.score.current);
        });
    })
    .catch(e => {
        console.error('Unable to retrieve tag: ' + e);
    });
