import * as functions from 'firebase-functions';

var geocoder = require('geocoder');

// Initialize Firebase Admin SDK

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.updateTag = functions.firestore.document('Tags/{tagId}').onUpdate(event => {
  const tag = event.after.data();
  const previous = event.before.data();

  let message;

  const delta_seconds = (Number(tag.lastseen) - Number(previous.lastseen)) / 1000;

  console.log("tag: %s tag.lastseen: %s previous.lastseen: %s: delta: %s",
    tag.tagId,
    tag.lastseen,
    previous.lastseen,
    delta_seconds);

  const location = tag.location.split(',');

  // Send a notification when a tag is detected after 10 minutes
  // XXX Confirm 10 minutes is the appropriate interval
  // if (delta_seconds > 600) {
    geocoder.reverseGeocode(location[0], location[1], function (err, data) {
      if (err) {
        console.error(JSON.stringify(err));
      }

      const address = data.results[0].address_components[2].long_name + "," + data.results[0].address_components[4].short_name;

      admin.firestore().collection('Users').doc(tag.uid).get().then(doc => {
        const settings = doc.data().settings;

        if (settings.tagNotifications) {
          sendNotification(tag.fcm_token,
            tag.tagId,
            "Huan Tag detected nearby!",
            "Tag " + tag.tagId + " has been detected after " + delta_seconds + " seconds");
        } else {
          console.log("Tag Notifications Disabled for tag " + tag.tagId);
        }

        if (Boolean(tag.lost) && Boolean(previous.lost)) {
          console.log("%s has been found! Notifying owners.", tag.name);

          message = "Your lost pet, " + tag.name + ", has been located!";
          sendNotification(tag.fcm_token, tag.tagId, message, "Near " + address);
        }
      })
    });
  // }

  // Notify if dog is marked as lost/found
  if (tag.lost !== previous.lost) {
    if (tag.lost) {
      message = tag.name + " is marked as lost";
    } else {
      message = tag.name + " is marked as found";
    }

    console.log("Sending: " + message);
    sendNotification(tag.fcm_token, tag.tagId, message, "");
  }


  return true;
});

// Function to push notification to a topic.
function sendNotification(fcm_token, tagId, title, body) {
  const payload = {
    notification: {
      title: title,
      body: body,
      sound: "default",
      clickAction: "FCM_PLUGIN_ACTIVITY",
      icon: "fcm_push_icon"
    },
    data: {
      "tagId": tagId,
      "title": title,
      "body": body,
      "type": "Cloud Function"
    },
  }

  console.log("Sending Notifications: " + JSON.stringify(payload));

  admin.messaging().sendToDevice(fcm_token, payload)
    .then(function (response) {
      console.log("Successfully sent message:", response);
    })
    .catch(function (error) {
      console.log("Error sending message:", error);
    });
}