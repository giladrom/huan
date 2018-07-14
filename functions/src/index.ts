import * as functions from 'firebase-functions';
import { event } from 'firebase-functions/lib/providers/analytics';
import { resolve } from 'path';

import * as lodash from 'lodash';

var NodeGeocoder = require('node-geocoder');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
  formatter: null
};

var geocoder = NodeGeocoder(options);

// Initialize Firebase Admin SDK

import * as admin from 'firebase-admin';
admin.initializeApp(functions.config().firebase);

exports.createReport = functions.firestore
  .document('Reports/{report}')
  .onCreate(report => {
    console.log('New report submitted: ' + JSON.stringify(report.data()));

    let title, body;

    // FIXME: Optimize this next block to remove duplicate code

    switch (report.data().report) {
      case 'police':
        title = 'New Leash Alert received!';

        getCommunity(report.data().location)
          .then(place => {
            body = 'Near ' + place.location;

            sendNotificationToTopic(
              place.community,
              title,
              body,
              report.data().location,
              'show_marker'
            );
          })
          .catch(e => {
            console.error('Unable to get community name: ' + e);
          });

        break;

      case 'hazard':
        title = 'New Hazard Reported in your community';

        getCommunity(report.data().location)
          .then(place => {
            body = 'Near ' + place.location;

            sendNotificationToTopic(
              place.community,
              title,
              body,
              report.data().location,
              'show_marker'
            );
          })
          .catch(e => {
            console.error('Unable to get community name: ' + e);
          });

        break;
    }
    return true;
  });

exports.updateTag = functions.firestore
  .document('Tags/{tagId}')
  .onUpdate(update => {
    const tag = update.after.data();
    const previous = update.before.data();

    let message;

    const delta_seconds =
      (Number(tag.lastseen) - Number(previous.lastseen)) / 1000;

    console.log(
      'tag: %s tag.lastseen: %s previous.lastseen: %s: delta: %s',
      tag.tagId,
      tag.lastseen,
      previous.lastseen,
      delta_seconds
    );

    const location = tag.location.split(',');

    // Get tag address
    geocoder
      .reverse({ lat: location[0], lon: location[1] })
      .then(res => {
        var address;

        try {
          if (res[0] !== undefined) {
            address = res[0].formattedAddress;

            console.log('Address: ' + address);
          } else {
            address = 'unknown address';
          }
        } catch (error) {
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
          .then(doc => {
            const settings = doc.data().settings;

            if (settings.tagNotifications) {
              sendNotification(
                tag,
                tag,
                'Huan Tag detected nearby!',
                'Tag ' +
                  tag.tagId +
                  ' has been detected after ' +
                  delta_seconds +
                  ' seconds'
              );
            } else {
              console.log('Tag Notifications Disabled for tag ' + tag.tagId);
            }

            // If tag has been scanned by someone other than the owner at a new place, send a notification
            if (
              tag.lastseenBy !== tag.uid &&
              tag.lastseenBy !== previous.lastseenBy
            ) {
              const new_location = tag.location.split(',');
              const old_location = previous.location.split(',');

              const distance =
                distanceInKmBetweenEarthCoordinates(
                  new_location[0],
                  new_location[1],
                  old_location[0],
                  old_location[1]
                ) * 1000;

              console.log(
                `Old location: ${tag.location} new Location: ${
                  previous.location
                } Distance: ${distance} meters`
              );

              // getPlaceId(tag.location)
              //   .then(new_place => {
              //     getPlaceId(previous.location)
              //       .then(old_place => {
              //         if (new_place !== old_place) {

              // FIXME: Adjust distance and find a way to detect GPS errors (-/+ 3km)
              // Only alert if distance from old location is greater than 300m
              if (distance > 300) {
                console.log(
                  '%s has been scanned by someone else (uid: %s)! Notifying.',
                  tag.name,
                  tag.lastseenBy
                );

                admin
                  .firestore()
                  .collection('Tags')
                  .where('uid', '==', tag.lastseenBy)
                  .get()
                  .then(finder => {
                    // Notify owners
                    sendNotification(
                      tag,
                      tag,
                      tag.name + ' was just seen away from home!',
                      'Near ' + address
                    );

                    finder.docs.map(f => {
                      console.log(f.data());

                      // Notify finder
                      sendNotification(
                        f.data(),
                        tag,
                        'Heads up! A lost pet is nearby.',
                        ''
                      );
                    });
                  })
                  .catch(err => {
                    console.error(
                      'Unable to get finder info: ' + JSON.stringify(err)
                    );
                  });
              }
              // }
              //     })
              //     .catch(err => {
              //       console.error(
              //         'Unable to get place Id: ' + JSON.stringify(err)
              //       );
              //     });
              // })
              // .catch(err => {
              //   console.error(
              //     'Unable to get owner settings: ' + JSON.stringify(err)
              //   );
              // });
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
                })
                .catch(err => {
                  console.error(
                    'Unable to update tag status: ' + JSON.stringify(err)
                  );
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
                    sendNotification(
                      finder.data(),
                      tag,
                      'Heads up! A lost pet is nearby.',
                      ''
                    );
                  });
                })
                .catch(err => {
                  console.error(
                    'Unable to get finder info: ' + JSON.stringify(err)
                  );
                });
            }
          })
          .catch(err => {
            console.error(
              'Unable to get owner settings: ' + JSON.stringify(err)
            );
          });
      })
      .catch(err => {
        if (err) {
          console.error('Reverse Geocoding failed: ' + JSON.stringify(err));
        }
      });

    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost && tag.lost !== 'seen') {
      if (tag.lost) {
        message = tag.name + ' is marked as lost';
      } else {
        message = tag.name + ' is marked as found';
      }

      console.log('Sending: ' + message);
      sendNotification(tag, tag, message, '');
    }

    return true;
  });

// Function to push notification to a device.
function sendNotificationToTopic(
  destination,
  title,
  body,
  location,
  func = ''
) {
  const payload = {
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
      function: func
    }
  };

  console.log(
    'Sending Notifications: ' + JSON.stringify(payload) + ' to ' + destination
  );

  admin
    .messaging()
    .sendToTopic(destination, payload)
    .then(function(response) {
      console.log('Successfully sent message:', JSON.stringify(response));
    })
    .catch(function(error) {
      console.log('Error sending message:', JSON.stringify(error));
    });
}

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

  console.log(
    'Sending Notifications: ' +
      JSON.stringify(payload) +
      'to ' +
      destination.fcm_token
  );

  admin
    .messaging()
    .sendToDevice(destination.fcm_token, payload)
    .then(function(response) {
      console.log('Successfully sent message:', JSON.stringify(response));
    })
    .catch(function(error) {
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
    })
    .catch(err => {
      console.error('Unable to update tag status: ' + JSON.stringify(err));
    });
}

function getPlaceId(location): Promise<any> {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise<any>((resolve, reject) => {
    const loc = location.split(',');

    let placeId;
    // Get tag address
    geocoder
      .reverse({ lat: loc[0], lon: loc[1] })
      .then(data => {
        try {
          if (data[0] !== undefined) {
            console.log('Place id: ' + data[0].extra.googlePlaceId);

            placeId = data[0].extra.googlePlaceId;
          } else {
            placeId = null;
          }

          resolve(placeId);
        } catch (error) {
          console.error(data);
          console.error(error);

          placeId = null;
          reject(null);
        }
      })
      .catch(err => {
        if (err) {
          console.error('Unable to get place id: ' + JSON.stringify(err));
        }

        reject(err);
      });
  });
}

function getCommunity(location): Promise<any> {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise<any>((resolve, reject) => {
    const loc = location.split(',');

    geocoder
      .reverse({ lat: loc[0], lon: loc[1] })
      .then(data => {
        console.log(data);

        let community = `${data[0].extra.neighborhood} ${
          data[0].administrativeLevels.level1short
        } ${data[0].countryCode}`;

        community = community.split(' ').join('_');

        community = lodash.deburr(community);

        try {
          const report_location = data[0].streetName;

          console.log('Community: ' + community);
          console.log('Loation: ' + report_location);

          resolve({
            community: community,
            location: report_location
          });
        } catch (error) {
          console.error(data);
          console.error(error);

          reject(null);
        }
      })
      .catch(err => {
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
  return degrees * Math.PI / 180;
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
