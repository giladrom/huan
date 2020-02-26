var moment = require("moment");

const admin = require("firebase-admin");

var serviceAccount = require("./huan-33de0-5245a569c6ed.json");

var twilio = require("twilio");
const accountSid = "ACc953b486792eb66808eec0c06066d99c"; // Your Account SID from www.twilio.com/console
const authToken = "27afe27991de2ca1567cf0cfcc697cd0"; // Your Auth Token from www.twilio.com/console
const sms_orig = "+13108818847";
const sms_dest = "+18189628603";
const client = new twilio(accountSid, authToken);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

const settings = {
  timestampsInSnapshots: true
};
db.settings(settings);

console.log("Starting up...");

admin
  .firestore()
  .collection("Users")
  .where("settings.homeAloneMode", "==", true)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      var user = doc.data();

      if (doc.id != "8XQXnyJP6pZa9UiGy30buKGRZgT2") return;

      console.log("User", doc.id);
      console.log("Home Address", user.account.address_coords);
      admin
        .firestore()
        .collection("Tags")
        .where("uid", "array-contains", doc.id)
        .get()
        .then(tags => {
          tags.forEach(tag => {
            tag = tag.data();

            const tag_location = tag.location.split(",");
            const home_location = user.account.address_coords.split(",");

            const distance =
              distanceInKmBetweenEarthCoordinates(
                tag_location[0],
                tag_location[1],
                home_location[0],
                home_location[1]
              ) * 1000;

            const elapsed_time_in_minutes: number = Math.floor(
              (moment().unix() - moment(tag.lastseen.toDate()).unix()) / 60
            );

            console.log(
              tag.tagId,
              elapsed_time_in_minutes,
              distance.toFixed(0)
            );

            if (elapsed_time_in_minutes >= 1380 && distance < 100) {
              var title: string = null,
                body: string = null;

              if (
                elapsed_time_in_minutes >= 1380 &&
                elapsed_time_in_minutes < 1385
              ) {
                // Send "Alert will be sent in one hour" notification
                console.log("Alert will be sent in one hour");

                title = "Home Alone Alert will be sent in one hour";
                body = `${tag.name} has been home alone for over 23 hours. Disable Home Alone Mode to Reset.`;
              }

              if (
                elapsed_time_in_minutes >= 1410 &&
                elapsed_time_in_minutes < 1415
              ) {
                // Send "Alert will be sent in 1/2 hour" notification
                console.log("Alert will be sent in 1/2 hour");

                title = "Home Alone Alert will be sent in 1/2 hour";
                body = `${tag.name} has been home alone for over 23 hours. Disable Home Alone Mode to Reset.`;
              }

              if (
                elapsed_time_in_minutes >= 1425 &&
                elapsed_time_in_minutes < 1430
              ) {
                // Send "Alert will be sent in 15 minutes" notification
                console.log("Alert will be sent in 15 minutes");

                title = "Home Alone Alert will be sent in 15 minutes";
                body = `${tag.name} has been home alone for over 23 hours. Disable Home Alone Mode to Reset.`;
              }

              if (
                elapsed_time_in_minutes >= 1440 &&
                elapsed_time_in_minutes < 1445
              ) {
                // Send Home Alone alert to emergency contacts
                console.log("Sending alerts");

                title = "Home Alone Alerts are being sent.";
                body = `${tag.name} has been home alone for over 24 hours. Alerting your Emergency Contacts.`;

                user.settings.emergencyContacts.forEach(contact => {
                  client.messages
                    .create({
                      body: `[THIS IS AN AUTOMATED MESSAGE SENT BY HUAN]. ${user.account.displayName}'s pet (${tag.name}) has been home alone for over 24 hours, and an emergency alert has been triggered. ${user.account.displayName} has listed you as an emergency contact to ensure ${tag.name}'s safety.`,
                      from: sms_orig,
                      to: contact.phoneNumber
                    })
                    .then(msg =>
                      console.log("Sent SMS to " + sms_dest, msg.sid)
                    )
                    .catch(e => {
                      console.error("Unable to send SMS", e);
                    });
                });
              }

              if (title != null) {
                sendNotification(tag, tag, title, body)
                  .then(r => {
                    console.log(r);
                  })
                  .catch(e => {
                    console.error(e);
                  });
              }
            }
          });
        })
        .catch(e => {
          console.error(e);
        });

      console.log(JSON.stringify(user.settings.emergencyContacts));
    });
  })
  .catch(e => {
    console.error("Unable to retrieve tag: " + e);
  });

function sendNotification(destination, tag, title, body, func = "") {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    console.log("destination: ", JSON.stringify(destination));

    destination.fcm_token.forEach(owner => {
      const message = {
        notification: {
          title: title,
          body: body
        },
        data: {
          tagId: tag.tagId,
          title: title,
          body: body,
          function: func,
          message: title
        },
        token: owner.token,
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              mutableContent: true
            }
          }
        }
      };

      console.log(
        "Sending Notifications: " +
          JSON.stringify(message) +
          " to " +
          owner.token
      );

      // Send a message to the device corresponding to the provided
      // registration token.
      if (owner.token !== null) {
        admin
          .messaging()
          .send(message)
          .then(response => {
            // Response is a message ID string.
            console.log("Successfully sent message:", response);

            resolve(response);
          })
          .catch(error => {
            console.log("Error sending message:", error);
            reject(error);
          });
      }
    });
  });
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
  var earthRadiusKm = 6371;

  var dLat = degreesToRadians(lat2 - lat1);
  var dLon = degreesToRadians(lon2 - lon1);

  var _lat1 = degreesToRadians(lat1);
  var _lat2 = degreesToRadians(lat2);

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(_lat1) * Math.cos(_lat2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}
