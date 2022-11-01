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


var min_id = '31400';
var max_id = '32999';

admin
  .firestore()
  .collection('Tags')
  .where('tagId', '>=', min_id)
  .where('tagId', '<=', max_id)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      var tag = doc.data();

      if (tag.tagId.length > 4) {
        console.log(tag.tagId, "already exists");
      }
    });

  })
  .catch(e => {
    console.error(e);
  });
