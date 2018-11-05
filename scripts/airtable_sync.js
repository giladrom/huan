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

var airtable_records = [];
var airtable_user_records = [];

base('Tags')
  .select({
    // Selecting the first 3 records in Grid view:
    // maxRecords: 100,
    fields: ['Tag ID']
  })
  .eachPage(
    function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      records.forEach(function(record) {
        // console.log('Retrieved', record.getId(), record.get('Tag ID'));
        airtable_records.push({
          record_id: record.getId(),
          tagId: record.get('Tag ID')
        });
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();
    },
    function done(err) {
      if (err) {
        console.error(err);
        return;
      }

      db.collection('Tags')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            var tag = doc.data();
            var r = airtable_records.findIndex(value => {
              return value.tagId == tag.tagId;
            });

            if (r > -1) {
              console.log(
                `${tag.tagId} has a record ID of ${
                  airtable_records[r].record_id
                }`
              );

              base('Tags')
                .update(airtable_records[r].record_id, {
                  'Last Seen':
                    typeof tag.lastseen === 'string'
                      ? moment(Number(tag.lastseen)).format()
                      : moment(tag.lastseen.toDate()).format(),
                  'Last Seen By': tag.lastseenBy,
                  Location: tag.location,
                  Lost: tag.lost
                })
                .then(record => {
                  console.log('Replace: OK: ', record.getId(), tag.tagId);
                })
                .catch(e => {
                  console.error('Replace: ERROR: ' + e, tag.tagId);
                });
            } else {
              console.log(tag);
              console.log(tag.uid[0]);

              base('Tags')
                .create({
                  'Tag ID': Number(tag.tagId),
                  Name: tag.name,
                  Breed:
                    typeof tag.breed === 'string' ? tag.breed : tag.breed[0],
                  Character: tag.character,
                  Color:
                    typeof tag.color === 'string' ? tag.color : tag.color[0],
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
                  console.log('Create: OK: ', record.getId(), tag.tagId);
                })
                .catch(e => {
                  console.error('Create: ERROR: ' + e, tag.tagId);
                });
            }
          });
        })
        .catch(err => {
          console.log('Error getting documents', err);
        });
    }
  );
