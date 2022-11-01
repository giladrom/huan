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
    .collection("Tags")
    .where("tagattached", "==", true)
    .get()
    .then((querySnapshot) => {
        let itemsProcessed = 0;
        const coords = [];

        console.log("Processing", querySnapshot.size, "items");

        db.collection("Coords").doc("Coords").set({
            data: []
        }).then((r) => { }).catch(e => console.error(e));

        querySnapshot.forEach((tag) => {
            itemsProcessed++;

            const latlng = tag.data().location.split(",");

            latlng[0] = parseFloat(latlng[0]).toFixed(5);
            latlng[1] = parseFloat(latlng[1]).toFixed(5);

            if (tag.data().tagId) {
                coords.push(`${latlng[0]},${latlng[1]}`);

            }

            if (itemsProcessed === querySnapshot.size) {
                console.log(coords);

                db.collection("Coords").doc("Coords").set({
                    data: coords
                }).then((r) => { }).catch(e => console.error(e));
            }
        });


    })
    .catch((e) => {
        console.error(e);
    });