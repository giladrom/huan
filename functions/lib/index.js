"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
var geocoder = require('geocoder');
// Initialize Firebase Admin SDK
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
exports.updateTag = functions.firestore
    .document('Tags/{tagId}')
    .onUpdate(event => {
    const tag = event.after.data();
    const previous = event.before.data();
    let message;
    const delta_seconds = (Number(tag.lastseen) - Number(previous.lastseen)) / 1000;
    console.log('tag: %s tag.lastseen: %s previous.lastseen: %s: delta: %s', tag.tagId, tag.lastseen, previous.lastseen, delta_seconds);
    const location = tag.location.split(',');
    // Send a notification when a tag is detected after 10 minutes
    // TODO: Confirm 10 minutes is the appropriate interval
    // if (delta_seconds > 600) {
    // Get tag address
    geocoder.reverseGeocode(location[0], location[1], function (err, data) {
        if (err) {
            console.error(JSON.stringify(err));
        }
        var address;
        try {
            if (data.results[0] !== undefined) {
                // address =
                //   data.results[0].address_components[2].long_name +
                //   ', ' +
                //   data.results[0].address_components[4].short_name;
                address = data.results[0].formatted_address;
            }
            else {
                address = 'unknown address';
            }
        }
        catch (error) {
            console.error(data);
            console.error(error);
            address = 'unknown address';
        }
        // Get tag owner settings
        admin
            .firestore()
            .collection('Users')
            .doc(tag.uid)
            .get()
            .then(doc => {
            const settings = doc.data().settings;
            if (settings.tagNotifications) {
                sendNotification(tag, tag, 'Huan Tag detected nearby!', 'Tag ' +
                    tag.tagId +
                    ' has been detected after ' +
                    delta_seconds +
                    ' seconds');
            }
            else {
                console.log('Tag Notifications Disabled for tag ' + tag.tagId);
            }
            // If tag has been scanned by someone other than the owner at a new place, send a notification
            if (tag.lastseenBy !== tag.uid &&
                getPlaceId(tag.location) !== getPlaceId(previous.location)) {
                console.log('%s has been scanned by someone else (uid: %s)! Notifying.', tag.name, tag.lastseenBy);
                // Notify owners
                sendNotification(tag, tag, tag.name + ' was just seen away from home!', 'Near ' + address);
                // Notify finder
                admin
                    .firestore()
                    .collection('Tags', ref => ref.where('uid', '==', tag.lastseenBy))
                    .get()
                    .then(finder => {
                    sendNotification(finder.data(), tag, 'Heads up! A lost pet is nearby.', '');
                });
            }
            // If tag is marked as lost, send a notification
            if (tag.lost === true) {
                console.log('%s has been found! Notifying owners.', tag.name);
                // Update the tag status to prevent repeating notifications
                admin
                    .firestore()
                    .collection('Tags')
                    .doc(tag.tagId)
                    .update({
                    lost: 'seen'
                });
                // Notify owners
                message = tag.name + ' was just seen!';
                sendNotification(tag, tag, message, 'Near ' + address, '');
                // Notify finder
                admin
                    .firestore()
                    .collection('Tags')
                    .where('uid', '==', tag.lastseenBy)
                    .limit(1)
                    .get()
                    .then(querySnapshot => {
                    querySnapshot.forEach(finder => {
                        console.log(JSON.stringify(finder.data()));
                        sendNotification(finder.data(), tag, 'Heads up! A lost pet is nearby.', '');
                    });
                });
            }
        });
    });
    // }
    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost) {
        if (tag.lost) {
            message = tag.name + ' is marked as lost';
        }
        else {
            message = tag.name + ' is marked as found';
        }
        console.log('Sending: ' + message);
        sendNotification(tag, tag, message, '');
    }
    return true;
});
// Function to push notification to a device.
function sendNotification(destination, tag, title, body, func = '') {
    const payload = {
        notification: {
            title: title,
            body: body,
            sound: 'default',
            clickAction: 'FCM_PLUGIN_ACTIVITY',
            icon: 'fcm_push_icon'
        },
        data: {
            tagId: tag.tagId,
            title: title,
            body: body,
            function: func
        }
    };
    console.log('Sending Notifications: ' +
        JSON.stringify(payload) +
        'to ' +
        destination.fcm_token);
    admin
        .messaging()
        .sendToDevice(destination.fcm_token, payload)
        .then(function (response) {
        console.log('Successfully sent message:', JSON.stringify(response));
    })
        .catch(function (error) {
        console.log('Error sending message:', JSON.stringify(error));
    });
    // Add notification to the User's Notification collection
    addNotificationToDB(destination.uid, title, body);
}
function addNotificationToDB(uid, title, body) {
    // Update the tag status to prevent repeating notifications
    admin
        .firestore()
        .collection('Users')
        .doc(uid)
        .collection('notifications')
        .doc(Date.now().toString())
        .set({
        title: title,
        body: body
    });
}
function getPlaceId(location) {
    const loc = location.split(',');
    let placeId;
    // Get tag address
    geocoder.reverseGeocode(loc[0], loc[1], function (err, data) {
        if (err) {
            console.error(JSON.stringify(err));
        }
        try {
            if (data.results[0] !== undefined) {
                console.log('Place id: ' + data.results[0].place_id);
                placeId = data.results[0].place_id;
            }
            else {
                placeId = null;
            }
        }
        catch (error) {
            console.error(data);
            console.error(error);
            placeId = null;
        }
    });
    return placeId;
}
//# sourceMappingURL=index.js.map