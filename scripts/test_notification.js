var net = require('net');
var os = require('os');
var moment = require('moment');

const admin = require('firebase-admin');

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

sendNotification()
  .then(() => {
    console.log('Success');
    return true;
  })
  .catch(e => {
    console.error(e);
  });

function sendNotification() {
  dest =
    'fvd-J1lSpkoDjmY7eAsM2I:APA91bFIX7jZt0lH5v8hB8MiJgyDnfNdSQOj9zMbhzQJBnds5htL6r4w6gKf1Va95FFBHrFpD991tI1DgmUp0VLwB6D1N4KdD72s2R5z0apYQ9wzRCVf06vgCukQ-2S7O3J0pfcpK3q_';
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise(async (resolve, reject) => {
    const message = {
      notification: {
        title: 'Hi',
        body: 'Body',
      },
      // data: {
      //   tagId: '1234',
      //   title: 'Title',
      //   body: 'Body',
      //   function: 'func',
      //   message: 'title',
      // },
      token: dest
    };

    var options = {
      priority: "high",
      timeToLive: 60 * 60 * 24
    };

    await admin
      .messaging()
      .send(message)
      .then(function (response) {
        console.log('Successfully sent message:', JSON.stringify(response));
        resolve(response);
      })
      .catch(function (error) {
        console.log('Error sending message:', JSON.stringify(error));
        reject(error);
      });
  });
}
