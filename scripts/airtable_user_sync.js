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

base('Users')
  .select({
    fields: ['UID']
  })
  .eachPage(
    function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      records.forEach(function (record) {
        // console.log('Retrieved', record.getId(), record.get('Tag ID'));
        airtable_user_records.push({
          record_id: record.getId(),
          uid: record.get('UID')
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

      db.collection('Users')
        .get()
        .then(snapshot => {
          snapshot.forEach(doc => {
            var user = doc.data();
            var r = airtable_user_records.findIndex(value => {
              return value.uid == doc.id;
            });

            admin
              .auth()
              .getUser(doc.id)
              .then(userRecord => {
                if (r > -1) {
                  console.log(
                    `${doc.id} has a record ID of ${airtable_user_records[r].record_id
                    }`
                  );

                  console.log(userRecord);

                  /*
                  base('Users')
                    .update(airtable_user_records[r].record_id, {
                      Name: String(user.account.displayName),
                      'E-Mail': userRecord.providerData[0].email,
                      'Referrals': user.account.referrals
                    })
                    .then(record => {
                      console.log(
                        'Update: OK: ',
                        record.getId(),
                        user.account.displayName,
                        userRecord.providerData[0].email
                      );
                    })
                    .catch(e => {
                      console.error('Update: ERROR: ' + e);
                    });
                    */
                } else {
                  if (user.signin !== 'Anonymous') {
                    console.log(`Creating new Airtable record for ${doc.id}`, user.account.displayName, userRecord.providerData[0].email);

                    base('Users')
                      .create({
                        UID: doc.id,
                        Name:
                          user.account !== undefined
                            ? String(user.account.displayName)
                            : '',
                        'E-Mail': userRecord.providerData[0].email
                      })
                      .then(record => {
                        console.log(
                          'Create: OK: ',
                          record.getId(),
                          user.account.displayName,
                          userRecord.providerData[0].email
                        );
                      })
                      .catch(e => {
                        console.error('Create: ERROR: ' + e);
                      });
                  }
                }
              })
              .catch(error => {
                console.log('Error fetching user data:', error);
              });
          });
        })
        .catch(err => {
          console.log('Error getting documents', err);
        });
    }
  );