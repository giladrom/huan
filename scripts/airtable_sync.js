var net = require('net');
var os = require('os');
var moment = require('moment');
var Airtable = require('airtable');
const admin = require('firebase-admin');

var base = new Airtable({ apiKey: 'keyH3TDLkjR4sV3X7' }).base(
  'appqddZSvgOtmD166'
);

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

const settings = { timestampsInSnapshots: true };
db.settings(settings);

// Get all records in database, iterate and replace if existing, create if not

db.collection('Tags')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      var tag = doc.data();

      console.log(tag);

      base('Tags')
        .create({
          'Tag ID': Number(tag.tagId),
          Name: tag.name,
          Breed: typeof tag.breed === 'string' ? tag.breed : tag.breed[0],
          Character: tag.character,
          Color: typeof tag.color === 'string' ? tag.color : tag.color[0],
          Gender: tag.gender,
          Image: [{ url: tag.img }],
          'Last Seen':
            typeof tag.lastseen === 'string'
              ? moment(Number(tag.lastseen)).format()
              : moment(tag.lastseen.toDate()).format(),
          'Last Seen By': tag.lastseenBy,
          Location: tag.location,
          Lost: tag.lost,
          Remarks: tag.remarks,
          Size: tag.size,
          'Tag Attached': tag.tagattached,
          User: typeof tag.uid === 'string' ? tag.uid : tag.uid[0]
        })
        .then(record => {
          console.log(record.getId());
        })
        .catch(e => {
          console.error('ERROR: ' + e);
        });
    });

    // tags.sort((a, b) => a.id < b.id);
  })
  .catch(err => {
    console.log('Error getting documents', err);
  });
