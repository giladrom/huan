var net = require('net');
var os = require('os');
var moment = require('moment');

const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
var tag = '22856';
var locationStr = "34.20165545199182,-118.76907224416082";
var uid = [
    "FG75pRTkpzYbfa1qhvJrl4DLNxr2",
    "JGnQ7l3PPphnfWH1bJIu8drj16Z2",
    "MAZYohLYy6hBZWjekFyC1Nr6oOm2",
    "cvAO5jWKLxd0GSLiuJmgqKziZxj1",
    "tOG2gDYtquSeDBOVbuKQ7alMkvy1"
];

var seconds = Date.now() / 1000;
var offset = 60 * 60;
var timestamp = new admin.firestore.Timestamp(Math.floor(seconds) + offset, 0);

console.log(timestamp);


db.collection('Tags')
    .doc(tag)
    .update({
        location: locationStr,
        lastseen: timestamp,
        lastseenBy: uid[randomIntFromInterval(0, uid.length - 1)],
    })
    .then(() => { })
    .catch(e => {
        console.error('Firestore error: ' + e);
    });


function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}