var net = require('net');
var os = require('os');
var moment = require('moment');
var Airtable = require('airtable');
const admin = require('firebase-admin');
const PQueue = require('p-queue');
const delay = require('delay');


var Airtable = require('airtable');
var base = new Airtable({ apiKey: 'keyH3TDLkjR4sV3X7' }).base('appAyWcweiyk4IGgP');

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

base('Rewards')
    .select({
        // Selecting the first 3 records in Grid view:
        //maxRecords: 10000,
        //fields: ['reward ID']
    })
    .eachPage(
        function page(records, fetchNextPage) {
            // This function (`page`) will get called for each page of records.

            records.forEach(function (record) {
                // console.log('Retrieved', record.getId(), record.get('image0'));
                airtable_records.push({
                    record_id: record.getId(),
                    image0: record.get('image0'),
                    credits: record.get('credits'),
                    desc: record.get('description'),
                    level: record.get('level'),
                    name: record.get('name'),
                    stock: record.get('stock')
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

            db.collection('Rewards')
                .get()
                .then(snapshot => {
                    airtable_records.forEach(airtable_record => {
                        var r = snapshot.docs.findIndex(value => {
                            // console.log(airtable_record.image0, value.data().imgs[0]);

                            console.log(value.id);

                            return airtable_record.image0 == value.data().imgs[0];
                        });

                        if (r < 0) {
                            console.log(airtable_record.name, 'is missing');

                            db.collection('Rewards').doc(airtable_record.record_id).set({
                                imgs: [
                                    airtable_record.image0
                                ],
                                credits: airtable_record.credits,
                                description: airtable_record.desc,
                                level: airtable_record.level,
                                name: airtable_record.name,
                                stock: airtable_record.stock
                            }).then(r => {
                                console.log(r);
                            }).catch(e => {
                                console.error(e);
                            });
                        } else {
                            console.log(airtable_record.name, 'has a firebase record');

                            snapshot.docs.forEach(firebase_record => {
                                if (airtable_record.image0 == firebase_record.data().imgs[0]) {
                                    console.log('Updating', firebase_record.id);

                                    db.collection('Rewards').doc(firebase_record.id).update({
                                        imgs: [
                                            airtable_record.image0
                                        ],
                                        credits: airtable_record.credits,
                                        description: airtable_record.desc,
                                        level: airtable_record.level,
                                        name: airtable_record.name,
                                        stock: airtable_record.stock
                                    }).then(r => {
                                        console.log('Update', r);
                                    }).catch(e => {
                                        console.error('Update', e);
                                    });
                                }
                            })
                            // db.collection('Rewards').doc(value.id)
                        }
                    })




                    // XXX
                })
                .catch(err => {
                    console.log('Error getting documents', err);
                });

        });
