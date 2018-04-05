"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
// Initialize Firebase Admin SDK
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
exports.updateTag = functions.firestore.document('Tags/{tagId}').onUpdate(event => {
    const tag = event.after.data();
    const previous = event.before.data();
    let message;
    //console.log("Tag data: " + JSON.stringify(tag));
    if (tag.lost !== previous.lost) {
        if (tag.lost) {
            message = tag.name + " is marked as lost";
        }
        else {
            message = tag.name + " is marked as found";
        }
        console.log("Sending: " + message);
        sendNotification(tag.fcm_token, message);
    }
    return true;
});
// Function to push notification to a topic.
function sendNotification(fcm_token, message) {
    let payload = {
        notification: {
            title: message,
            body: "Firestore Function"
        }
    };
    admin.messaging().sendToDevice(fcm_token, payload)
        .then(function (response) {
        console.log("Successfully sent message:", response);
    })
        .catch(function (error) {
        console.log("Error sending message:", error);
    });
}
//# sourceMappingURL=index.js.map