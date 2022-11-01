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

const beginningDate = Date.now() - 36000000;
const beginningDateObject = new Date(beginningDate);

admin
    .firestore()
    .collection("communityEvents")
    .where("timestamp", ">", beginningDateObject)
    .orderBy("timestamp", "desc")
    .get()
    .then((querySnapshot) => {
        let itemsProcessed = 0;
        const events = [];

        console.log("Processing", querySnapshot.size, "items");

        db.collection("Pack").doc("Pack").set({
            data: []
        }).then((r) => { }).catch(e => console.error(e));

        querySnapshot.forEach((e) => {
            itemsProcessed++;

            console.log(e.data());

            e = e.data();

            events.push(e);

            if (itemsProcessed === querySnapshot.size) {
                console.log(events);

                db.collection("Events").doc("Event").set({
                    data: events
                }).then((r) => { }).catch(e => console.error(e));
            }
        });


    })
    .catch((e) => {
        console.error(e);
    });