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
    var delta_seconds = (Number(tag.lastseen) - Number(previous.lastseen)) / 1000;
    console.log("tag: %s tag.lastseen: %s previous.lastseen: %s: delta: %s", tag.tagId, tag.lastseen, previous.lastseen, delta_seconds);
    if (delta_seconds > 60) {
        sendNotification(tag.fcm_token, tag.tagId, "Huan Tag detected nearby!", "Tag " + tag.tagId + " has been detected after " + delta_seconds + " seconds");
        if (Boolean(tag.lost) && Boolean(previous.lost)) {
            console.log("%s has been found! Notifying owners device.", tag.name);
            message = "Your lost pet, " + tag.name + ", has been located!";
            sendNotification(tag.fcm_token, tag.tagId, message, "");
        }
    }
    if (tag.lost !== previous.lost) {
        if (tag.lost) {
            message = tag.name + " is marked as lost";
        }
        else {
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
            "type": "Cloud Function"
        },
    };
    console.log("Sending Notifications: " + JSON.stringify(payload));
    admin.messaging().sendToDevice(fcm_token, payload)
        .then(function (response) {
        console.log("Successfully sent message:", response);
    })
        .catch(function (error) {
        console.log("Error sending message:", error);
    });
}
//# sourceMappingURL=index.js.map