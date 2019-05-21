var net = require('net');
var os = require('os');
var moment = require('moment');
var Airtable = require('airtable');
const admin = require('firebase-admin');
const PQueue = require('p-queue');
const delay = require('delay');


var base = new Airtable({
  apiKey: 'keyH3TDLkjR4sV3X7'
}).base(
  'appqddZSvgOtmD166'
);

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

const settings = {
  timestampsInSnapshots: true
};
db.settings(settings);

// Get all records in database, iterate and replace if existing, create if not

var airtable_records = [];

const queue = new PQueue({
  concurrency: 1
});

base('Tags')
  .select({
    // Selecting the first 3 records in Grid view:
    //maxRecords: 10000,
    //fields: ['Tag ID']
  })
  .eachPage(
    function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      records.forEach(function (record) {
        console.log('Retrieved', record.getId(), record.get('Tag ID'));
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

      console.log("Loaded", airtable_records.length, "records");



      airtable_records.forEach(record => {
        // XXX

        (async () => {
          await queue.add(() => {
            console.log('Checking', String(record.tagId).padStart(4, "0"));

            if (record.tagId > 0) {
              db.collection('Tags')
                .doc(String(record.tagId).padStart(4, "0"))
                .get()
                .then(doc => {
                  if (!doc.exists) {
                    console.log(record.tagId, "does not have a Firestore record, should be deleted");

                    base('Tags').destroy(record.record_id, function (err, deletedRecord) {
                      if (err) {
                        console.error(err);
                        return;
                      }
                      console.log('Deleted record', deletedRecord.id);
                    });

                  } else {
                    if (doc.get('placeholder')) {
                      console.log(record.tagId, "Placeholder, should be deleted");

                      base('Tags').destroy(record.record_id, function (err, deletedRecord) {
                        if (err) {
                          console.error(err);
                          return;
                        }
                        console.log('Deleted record', deletedRecord.id);
                      });
                    } else {
                      console.log(record.tagId, "Firebase entry valid");
                    }
                  }
                }).catch(e => {
                  console.error(e);
                })
            }
          })
        })();

        // XXX
      })


      db.collection('Tags')
        .get()
        .then(snapshot => {

          snapshot.forEach(doc => {

            (async () => {
			  await delay(200);

              await queue.add(async () => {

				await delay(200);

                var tag = doc.data();

                var r = airtable_records.findIndex(value => {
                  return value.tagId == tag.tagId;
                });

                var uid_records = [];

                if (r > -1) {
                  console.log(
                    `${tag.tagId} has a record ID of ${airtable_records[r].record_id}`
                  );

                  base('Users').select({
                    filterByFormula: "UID = '" + tag.uid[0] + "'",
                    view: "Grid view"
                  }).eachPage(function page(records, fetchNextPage) {
                    // This function (`page`) will get called for each page of records.

                    records.forEach(function (record) {
                      console.log('Retrieved', record.get('UID'), record.getId());
                      uid_records.push(record.getId());
                    });

                    // To fetch the next page of records, call `fetchNextPage`.
                    // If there are more records, `page` will get called again.
                    // If there are no more records, `done` will get called.
                    fetchNextPage();

                  }, function done(err) {
                    if (err) {
                      console.error(err);
                      return;
                    }
                    if (uid_records.length > 1) {
                      console.log('User Records', tag.tagId, uid_records);
                    }

                    base('Tags')
                      .update(airtable_records[r].record_id, {
                        'Last Seen': typeof tag.lastseen === 'string' ?
                          moment(Number(tag.lastseen)).format() : moment(tag.lastseen.toDate()).format(),
                        'Last Seen By': tag.lastseenBy,
                        Location: tag.location,
                        Lost: tag.lost ? "Lost" : "Not Lost",
                        User: uid_records
                      })
                      .then(record => {
                        console.log('Replace: OK: ', tag.tagId, record.getId());
                      })
                      .catch(e => {
                        console.error('Replace: ERROR: ', tag.tagId, e);
                      });

                  })

                } else {
                  if (tag.tagId > 0) {
                    console.log("Creating a new Airtable entry for", tag.tagId);


                    base('Users').select({
                      filterByFormula: "UID = '" + tag.uid[0] + "'",
                      view: "Grid view"
                    }).eachPage(function page(records, fetchNextPage) {
                      // This function (`page`) will get called for each page of records.

                      records.forEach(function (record) {
                        console.log('Retrieved', record.get('UID'), record.getId());
                        uid_records.push(record.getId());
                      });

                      // To fetch the next page of records, call `fetchNextPage`.
                      // If there are more records, `page` will get called again.
                      // If there are no more records, `done` will get called.
                      fetchNextPage();

                    }, function done(err) {
                      if (err) {
                        console.error(err);
                        return;
                      }
                      if (uid_records.length > 1) {
                        console.log('User Records', tag.tagId, uid_records);
                      }

                      console.log("Creating record for", tag.tagId);

                      var lastseen;
                      if (tag.lastseen) {
                        lastseen = (typeof tag.lastseen === 'string') ?
                          moment(Number(tag.lastseen)).format() :
                          moment(tag.lastseen.toDate() || '').format();
                      } else {
                        lastseen = '';
                      }


                      base('Tags')
                        .create({
                          'Tag ID': Number(tag.tagId),
                          Name: tag.name,
                          Breed: typeof tag.breed === 'string' ? tag.breed : tag.breed[0],
                          Character: tag.character,
                          Color: typeof tag.color === 'string' ? tag.color : tag.color[0],
                          Gender: tag.gender,
                          Image: [{
                            url: tag.img
                          }],
                          'Last Seen': lastseen,
                          'Last Seen By': tag.lastseenBy,
                          Location: tag.location,
                          Lost: tag.lost ? "Lost" : "Not Lost",
                          Remarks: tag.remarks,
                          Size: tag.size,
                          'Tag Attached': tag.tagattached,
                          User: uid_records
                        })
                        .then(record => {
                          console.log('Create: OK: ', tag.tagId, record.getId());
                        })
                        .catch(e => {
                          console.error('Create: ERROR: ', tag.tagId, e);
                        });

                    });

                  }
                }

				
			  });
			  queue.add(() => delay(500));
            })();
            // XXXXXXX
          });
          // XXX
        })
        .catch(err => {
          console.log('Error getting documents', err);
        });

      //   airtable_records.forEach(record => {
      //     console.log(`Record: ${record.record_id} Tag ID: ${record.tagId}`);
      //   });
    });
