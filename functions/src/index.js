"use strict";
exports.__esModule = true;
var functions = require("firebase-functions");
var NodeGeocoder = require('node-geocoder');
var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
    formatter: null
};
var geocoder = NodeGeocoder(options);
// Initialize Firebase Admin SDK
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
exports.updateTag = functions.firestore
    .document('Tags/{tagId}')
    .onUpdate(function (event) {
    var tag = event.after.data();
    var previous = event.before.data();
    var message;
    var delta_seconds = (Number(tag.lastseen) - Number(previous.lastseen)) / 1000;
    console.log('tag: %s tag.lastseen: %s previous.lastseen: %s: delta: %s', tag.tagId, tag.lastseen, previous.lastseen, delta_seconds);
    var location = tag.location.split(',');
    // Send a notification when a tag is detected after 10 minutes
    // TODO: Confirm 10 minutes is the appropriate interval
    // if (delta_seconds > 600) {
    // Get tag address
    geocoder
        .reverse({ lat: location[0], lon: location[1] })
        .then(function (res) {
        var address;
        console.log('Result: ' + res);
        try {
            if (res[0] !== undefined) {
                address = res[0].formattedAddress;
                console.log('Address: ' + address);
            }
            else {
                address = 'unknown address';
            }
        }
        catch (error) {
            console.error('Unable to find address: ' + res);
            console.error(error);
            address = 'unknown address';
        }
        console.log('Retrieved address');
        // Get tag owner settings
        admin
            .firestore()
            .collection('Users')
            .doc(tag.uid)
            .get()
            .then(function (doc) {
            var settings = doc.data().settings;
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
                    .collection('Tags', function (ref) {
                    return ref.where('uid', '==', tag.lastseenBy);
                })
                    .get()
                    .then(function (finder) {
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
                    .then(function (querySnapshot) {
                    querySnapshot.forEach(function (finder) {
                        console.log(JSON.stringify(finder.data()));
                        sendNotification(finder.data(), tag, 'Heads up! A lost pet is nearby.', '');
                    });
                });
            }
        });
    })["catch"](function (err) {
        if (err) {
            console.error('Reverse Geocoding failed: ' + JSON.stringify(err));
        }
    });
    // }
    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost && tag.lost !== 'seen') {
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
function sendNotification(destination, tag, title, body, func) {
    if (func === void 0) { func = ''; }
    var payload = {
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
            "function": func
        }
    };
    console.log('Sending Notifications: ' +
        JSON.stringify(payload) +
        'to ' +
        destination.fcm_token);
    // XXX UNCOMMENT
    /*
    admin
      .messaging()
      .sendToDevice(destination.fcm_token, payload)
      .then(function(response) {
        console.log('Successfully sent message:', JSON.stringify(response));
      })
      .catch(function(error) {
        console.log('Error sending message:', JSON.stringify(error));
      });
      */
    // XXX UNCOMMENT
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
    var loc = location.split(',');
    var placeId;
    // Get tag address
    geocoder
        .reverse({ lat: loc[0], lon: loc[1] })
        .then(function (data) {
        try {
            if (data[0] !== undefined) {
                console.log('Place id: ' + data[0].extra.googlePlaceId);
                placeId = data[0].extra.googlePlaceId;
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
    })["catch"](function (err) {
        if (err) {
            console.error('Unable to get place id: ' + JSON.stringify(err));
        }
    });
    return placeId;
}
