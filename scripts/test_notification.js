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
  })
  .catch(e => {
    console.error(e);
  });

function sendNotification() {
  dest =
    'cGyc8Dj8Oxg:APA91bHwg8H1O9NjX8vK05I43xVXX3C3HiXJvGmckhKaA6ewVwPH9LXANeUa1aTXrHjCopMdIWv-eylFwOhT6gq9sYv7FW6gcimw0WVjxoJaknfEG-SvbcSj1unwc4LL2FdflJYDEOCN';
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    const payload = {
      data: {
        payload: 'activation',
        click_action: 'FCM_PLUGIN_ACTIVITY'
      }
    };

    console.log(
      'Sending Notifications: ' + JSON.stringify(payload) + 'to ' + dest
    );

    admin
      .messaging()
      .sendToDevice(dest, payload, { dryRun: false })
      .then(function(response) {
        console.log('Successfully sent message:', JSON.stringify(response));
        resolve(response);
      })
      .catch(function(error) {
        console.log('Error sending message:', JSON.stringify(error));
        reject(error);
      });
  });
}
