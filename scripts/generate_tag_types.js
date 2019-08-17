var net = require('net');
var os = require('os');
var moment = require('moment');
const uuidv1 = require('uuid/v1');

const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();


var tags = [
    // { color: ['black'], name: 'Black', type: 'hanging' },
    // { color: ['coral'], name: 'Coral', type: 'sleeve' },
    // { color: ['#fdce00'], name: 'Orange', type: 'hanging' },
    // { color: ['#fdce00'], name: 'Orange', type: 'sleeve' },
    // { color: ['#9b9ad1'], name: 'Purple', type: 'sleeve' },
    // { color: ['#9b9ad1'], name: 'Purple', type: 'hanging' },
    // { color: ['#ff00a8'], name: 'Pink', type: 'sleeve' },
    // { color: ['#ff00a8'], name: 'Pink', type: 'hanging' },
    // { color: ['#3e89a0'], name: 'Teal', type: 'sleeve' },
    // { color: ['#3e89a0'], name: 'Teal', type: 'hanging' },
    // { color: ['#a2fdb9'], name: 'Green Glow', type: 'sleeve' },
    // { color: ['#E00A18', '#FD8C26', '#FFEC34', '#0F812D', '#1054FD', '#731283'], name: 'Rainbow', type: 'sleeve' },
    // { color: ['#E00A18', '#FD8C26', '#FFEC34', '#0F812D', '#1054FD', '#731283'], name: 'Rainbow', type: 'hanging' },
    // { color: ['#1E90FF'], name: 'Dodger Blue', type: 'hanging' },
    // { color: ['#1E90FF'], name: 'Dodger Blue', type: 'sleeve' },
    // { color: ['#691DAB'], name: 'Deep Purple', type: 'hanging' },
    // { color: ['#691DAB'], name: 'Deep Purple', type: 'sleeve' },
    { color: ['#FFA7D1', '#FF85BD', '#FFDDE2', '#E31C79'], name: 'Pink Camo', type: 'sleeve' },
    { color: ['#2B74B7', '#041C2C', '#003C71', '#A2B2C8'], name: 'Blue Camo', type: 'sleeve' },
    { color: ['#C9BD83', '#4A412A', '#607950', '#242721'], name: 'Army Camo', type: 'sleeve' },

];


tags.forEach(tag => {
    // XXX: Commenting out for safety since these already exist in the DB

    db.collection('tagTypes')
        .doc(uuidv1())
        .set({
            'available': false,
            'color': tag.color,
            'name': tag.name,
            'subscription': [
                // 'com.gethuan.huanapp.basic_protection',
                // 'com.gethuan.huanapp.community_protection_15_mile_monthly',
                'com.gethuan.huanapp.community_protection_unlimited_monthly'
            ],
            'type': tag.type
        })
        .then(() => { })
        .catch(e => {
            console.error('tagTypes set', e);
        });


})
