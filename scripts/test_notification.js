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
    'dJW_M08IP8c:APA91bHBupM634yJip7Zt6hkd8Wn2NfAEP81ezMN1FDposB9QpSEm4DR-2l0f85E3iIpzy4pGsP509BS5850ekI1Neera9-p2y_wpplwbhTRm7EuLNJwxBdv7TRDu5xySQq0jDipYTTU';
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    const message = {
      token: dest,
      apns: {
        payload: {
          aps: {
            contentAvailable: true
          }
        }
      }
    };

    admin
      .messaging()
      .send(message, false)
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
