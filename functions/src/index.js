"use strict";
exports.__esModule = true;
var functions = require("firebase-functions");
var lodash = require("lodash");
var NodeGeocoder = require('node-geocoder');
var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
    formatter: null
};
var geocoder = NodeGeocoder(options);
// Initialize Firebase Admin SDK
var admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
exports.createReport = functions.firestore
    .document('Reports/{report}')
    .onCreate(function (report) {
    console.log('New report submitted: ' + JSON.stringify(report.data()));
    var title, body;
    // FIXME: Optimize this next block to remove duplicate code
    switch (report.data().report) {
        case 'police':
            title = 'New Leash Alert received!';
            getCommunity(report.data().location)
                .then(function (place) {
                body = 'Near ' + place.location;
                sendNotificationToTopic(place.community, title, body, report.data().location, 'show_location')
                    .then(function () {
                    console.log('Notification sent');
                })["catch"](function () {
                    console.error('Unable to send notification');
                });
                // addTopicNotificationsToDb(place.community, title, body);
            })["catch"](function (e) {
                console.error('Unable to get community name: ' + e);
            });
            break;
        case 'hazard':
            title = 'New Hazard Reported in your community';
            getCommunity(report.data().location)
                .then(function (place) {
                body = 'Near ' + place.location;
                sendNotificationToTopic(place.community, title, body, report.data().location, 'show_location')
                    .then(function () {
                    console.log('Notification sent');
                })["catch"](function () {
                    console.error('Unable to send notification');
                });
                // addTopicNotificationsToDb(place.community, title, body);
            })["catch"](function (e) {
                console.error('Unable to get community name: ' + e);
            });
            break;
    }
    return true;
});
exports.updateTag = functions.firestore
    .document('Tags/{tagId}')
    .onUpdate(function (update) {
    var message;
    var tag = update.after.data();
    var previous = update.before.data();
    // Elapsed time from last time tag was seen
    var delta_seconds;
    // Try to get delta using server timestamps, and fallback into old format
    try {
        delta_seconds =
            (Number(tag.lastseen.toDate()) - Number(previous.lastseen.toDate())) /
                1000;
    }
    catch (e) {
        delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
    }
    // Calculate distance from last known location
    var new_location = tag.location.split(',');
    var old_location = previous.location.split(',');
    var distance = distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], old_location[0], old_location[1]) * 1000;
    console.log('tag: %s seen by %s time delta: %s meters from last: %s', tag.tagId, tag.lastseenBy, 
    // tag.lastseen,
    // previous.lastseen,
    delta_seconds, distance);
    // Get tag owner settings
    try {
        tag.uid.forEach(function (uid) {
            admin
                .firestore()
                .collection('Users')
                .doc(uid)
                .get()
                .then(function (doc) {
                handleTag(tag, previous, doc);
            })["catch"](function (err) {
                console.error('[Tag ' +
                    tag.tagId +
                    '] Unable to get owner settings: ' +
                    JSON.stringify(err));
            });
        });
    }
    catch (_a) {
        admin
            .firestore()
            .collection('Users')
            .doc(tag.uid)
            .get()
            .then(function (doc) {
            handleTag(tag, previous, doc);
        })["catch"](function (err) {
            console.error('Unable to get owner settings: ' + JSON.stringify(err));
        });
    }
    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost && tag.lost !== 'seen') {
        if (tag.lost) {
            message = tag.name + ' is missing!';
        }
        else {
            message = tag.name + ' was found!';
        }
        getCommunity(tag.location)
            .then(function (place) {
            var body = 'Near ' + place.location;
            sendNotificationToTopic(place.community, message, body, tag.location, 'lost_pet')
                .then(function () {
                console.log('Notification sent');
            })["catch"](function () {
                console.error('Unable to send notification');
            });
        })["catch"](function (e) {
            console.error('Unable to get community name: ' + e);
        });
    }
    return true;
});
function handleTag(tag, previous, doc) {
    var message;
    var settings = doc.data().settings;
    var account = doc.data().account;
    // Elapsed time from last time tag was seen
    var delta_seconds;
    // Try to get delta using server timestamps, and fallback into old format
    try {
        delta_seconds =
            (Number(tag.lastseen.toDate()) - Number(previous.lastseen.toDate())) /
                1000;
    }
    catch (e) {
        delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
    }
    // Calculate distance from last known location
    var new_location = tag.location.split(',');
    var old_location = previous.location.split(',');
    var distance = distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], old_location[0], old_location[1]) * 1000;
    if (settings.tagNotifications) {
        sendNotification(tag, tag, 'Huan Tag detected nearby!', 'Tag ' +
            tag.tagId +
            ' has been detected after ' +
            delta_seconds +
            ' seconds')
            .then(function () {
            console.log('Notification sent');
        })["catch"](function () {
            console.error('Unable to send notification');
        });
    }
    // XXX FIXME: XXX
    // Make sure this is the right scenario
    // XXX FIXME: XXX
    // If tag has been scanned by someone other than the owner VERY close to home, don't send a notification
    var distance_from_home = -1;
    var old_distance_from_home = -1;
    if (account.address_coords !== undefined) {
        var home_location = account.address_coords.split(',');
        distance_from_home =
            distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], home_location[0], home_location[1]) * 1000;
        old_distance_from_home =
            distanceInKmBetweenEarthCoordinates(old_location[0], old_location[1], home_location[0], home_location[1]) * 1000;
    }
    console.log("Tag " + tag.tagId + " Old location: " + tag.location + " new Location: " + previous.location + " Distance: " + distance + "m/" + distance_from_home + "m from home");
    // IF  tag has been scanned by someone other than the owner,
    // AND at a new place
    // AND at least 10 minutes have passed
    // AND that place is more than 100m away from home
    // THEN proceed
    if (tag.lastseenBy !== tag.uid &&
        tag.lastseenBy !== previous.lastseenBy &&
        delta_seconds > 600 &&
        (distance_from_home < 0 || distance_from_home > 100) &&
        (old_distance_from_home < 0 || old_distance_from_home > 100)) {
        // FIXME: Adjust distance and find a way to detect GPS errors (-/+ 3km)
        // Only alert if distance from old location is greater than 1km
        if (distance > 1000) {
            console.log('%s has been scanned by someone else (uid: %s)! Notifying.', tag.name, tag.lastseenBy);
            admin
                .firestore()
                .collection('Tags')
                .where('uid', 'array-contains', tag.lastseenBy)
                .limit(1)
                .get()
                .then(function (finder) {
                var location = tag.location.split(',');
                // Get tag address
                geocoder
                    .reverse({ lat: location[0], lon: location[1] })
                    .then(function (res) {
                    var address;
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
                    // Notify owners
                    sendNotification(tag, tag, tag.name + ' was just seen away from home!', 'Near ' + address, 'show_marker')
                        .then(function () {
                        console.log('Notification sent');
                    })["catch"](function () {
                        console.error('Unable to send notification');
                    });
                    console.log(JSON.stringify(finder.docs.length));
                    finder.docs.map(function (f) {
                        console.log(f.data());
                        // Notify finder
                        var himher = tag.gender === 'Male' ? 'he' : 'she';
                        sendNotification(f.data(), tag, tag.name + " is near, is " + himher + " lost?", "Can you see " + tag.name + "'s owners?", 'lost_pet')
                            .then(function () {
                            console.log('Notification sent');
                        })["catch"](function () {
                            console.error('Unable to send notification');
                        });
                    });
                })["catch"](function (err) {
                    if (err) {
                        console.error('Reverse Geocoding failed: ' + JSON.stringify(err));
                    }
                });
            })["catch"](function (err) {
                console.error('Unable to get finder info: ' + JSON.stringify(err));
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
            })["catch"](function (err) {
                console.error('Unable to update tag status: ' + JSON.stringify(err));
            });
            var location_1 = tag.location.split(',');
            // Get tag address
            geocoder
                .reverse({ lat: location_1[0], lon: location_1[1] })
                .then(function (res) {
                var address;
                console.log(JSON.stringify(res));
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
                    address = 'Unknown address';
                }
                console.log('Retrieved address');
                // Notify owners
                message = tag.name + ' was just seen!';
                sendNotification(tag, tag, message, 'Near ' + address, 'show_marker')
                    .then(function () {
                    console.log('Notification sent');
                })["catch"](function () {
                    console.error('Unable to send notification');
                });
            })["catch"](function (err) {
                if (err) {
                    console.error('Reverse Geocoding failed: ' + JSON.stringify(err));
                }
            });
            // Notify finder
            admin
                .firestore()
                .collection('Tags')
                .where('uid', 'array-contains', tag.lastseenBy)
                .limit(1)
                .get()
                .then(function (querySnapshot) {
                querySnapshot.forEach(function (finder) {
                    console.log(JSON.stringify(finder.data()));
                    sendNotification(finder.data(), tag, 'Heads up! A lost pet is nearby.', tag.name + (" (" + tag.breed + "//" + tag.color + "//" + tag.size + ")"), 'lost_pet')
                        .then(function () {
                        console.log('Notification sent');
                    })["catch"](function () {
                        console.error('Unable to send notification');
                    });
                });
            })["catch"](function (err) {
                console.error('Unable to get finder info: ' + JSON.stringify(err));
            });
        }
    }
}
// Function to push notification to a device.
function sendNotificationToTopic(destination, title, body, location, func) {
    if (func === void 0) { func = ''; }
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
        var payload = {
            notification: {
                title: title,
                body: body,
                sound: 'default',
                clickAction: 'FCM_PLUGIN_ACTIVITY',
                icon: 'fcm_push_icon'
            },
            data: {
                location: location,
                title: title,
                body: body,
                "function": func
            }
        };
        console.log('Sending Notifications: ' + JSON.stringify(payload) + ' to ' + destination);
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
        admin
            .messaging()
            .sendToTopic(destination, payload)
            .then(function (response) {
            console.log('Successfully sent message:', JSON.stringify(response));
            addTopicNotificationsToDb(destination, payload)
                .then(function () {
                console.log('Added notification to DB');
            })["catch"](function (err) {
                console.error(err);
            });
            resolve(response);
        })["catch"](function (error) {
            console.log('Error sending message:', JSON.stringify(error));
            reject(error);
        });
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
    });
}
// Function to push notification to a device.
function sendNotification(destination, tag, title, body, func) {
    if (func === void 0) { func = ''; }
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
        var payload = {
            mutable_content: true,
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
                "function": func,
                mediaUrl: tag.img
            }
        };
        console.log('Sending Notifications: ' +
            JSON.stringify(payload) +
            'to ' +
            destination.fcm_token);
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
        admin
            .messaging()
            .sendToDevice(destination.fcm_token, payload)
            .then(function (response) {
            console.log('Successfully sent message:', JSON.stringify(response));
            // Add notification to the User's Notification collection
            addNotificationToDB(destination.uid, payload)
                .then(function () {
                console.log('Added notification to DB');
            })["catch"](function (err) {
                console.error(err);
            });
            resolve(response);
        })["catch"](function (error) {
            console.log('Error sending message:', JSON.stringify(error));
            reject(error);
        });
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
    });
}
function addNotificationToDB(uid, payload) {
    // Update the tag status to prevent repeating notifications
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
        admin
            .firestore()
            .collection('Users')
            .doc(uid)
            .collection('notifications')
            .doc(Date.now().toString())
            .set({
            payload: payload
        })
            .then(function (res) {
            resolve(res);
        })["catch"](function (err) {
            console.error('Unable to update tag status: ' + JSON.stringify(err));
            reject(err);
        });
    });
}
function addTopicNotificationsToDb(topic, payload) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
        admin
            .firestore()
            .collection('Users')
            .where('settings.communityNotificationString', '==', topic)
            .get()
            .then(function (docs) {
            docs.forEach(function (doc) {
                doc.ref
                    .collection('notifications')
                    .doc(Date.now().toString())
                    .set({
                    payload: payload
                })
                    .then(function (res) {
                    resolve(res);
                })["catch"](function (err) {
                    console.error('Unable to perform batch write to db: ' + JSON.stringify(err));
                    reject(err);
                });
            });
        })["catch"](function (err) {
            console.error('Unable to locate matching documents: ' + JSON.stringify(err));
        });
    });
}
function getPlaceId(location) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
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
                resolve(placeId);
            }
            catch (error) {
                console.error(data);
                console.error(error);
                placeId = null;
                reject(null);
            }
        })["catch"](function (err) {
            if (err) {
                console.error('Unable to get place id: ' + JSON.stringify(err));
            }
            reject(err);
        });
    });
}
function getCommunity(location) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise(function (resolve, reject) {
        var loc = location.split(',');
        geocoder
            .reverse({ lat: loc[0], lon: loc[1] })
            .then(function (data) {
            console.log(data);
            var community = data[0].extra.neighborhood + " " + data[0].administrativeLevels.level1short + " " + data[0].countryCode;
            community = community.split(' ').join('_');
            community = lodash.deburr(community);
            try {
                var report_location = data[0].streetName;
                console.log('Community: ' + community);
                console.log('Loation: ' + report_location);
                resolve({
                    community: community,
                    location: report_location
                });
            }
            catch (error) {
                console.error(data);
                console.error(error);
                reject(null);
            }
        })["catch"](function (err) {
            if (err) {
                console.error('Unable to get community id: ' + JSON.stringify(err));
            }
            reject(err);
        });
    });
}
// Calculate geographical distance between two GPS coordinates
// Shamelessly stolen from https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
function distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
    var earthRadiusKm = 6371;
    var dLat = degreesToRadians(lat2 - lat1);
    var dLon = degreesToRadians(lon2 - lon1);
    var _lat1 = degreesToRadians(lat1);
    var _lat2 = degreesToRadians(lat2);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(_lat1) * Math.cos(_lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}
