import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import lodash = require('lodash');
import moment = require('moment');

var twilio = require('twilio');
var sgMail = require('@sendgrid/mail');

var NodeGeocoder = require('node-geocoder');

// var options: any = {
//   provider: 'google',
//   httpAdapter: 'https',
//   apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
//   formatter: null
// };
var geocoder = NodeGeocoder({
  provider: 'google',
  httpAdapter: 'https',
  apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
  formatter: null
});

const accountSid = 'ACc953b486792eb66808eec0c06066d99c'; // Your Account SID from www.twilio.com/console
const authToken = '27afe27991de2ca1567cf0cfcc697cd0'; // Your Auth Token from www.twilio.com/console
const sms_orig = '+13108818847';
const sms_dest = '+18189628603';
const client = new twilio(accountSid, authToken);

sgMail.setApiKey(
  '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'
);

// Initialize Firebase Admin SDK

// admin.initializeApp(functions.config().firebase);
admin.initializeApp();

const db = admin.firestore();

const log_context = moment().format('x');
/*
 * Pub/Sub-triggered function which simulates sending (or actually sends) an
 * email before calling a flaky service. In this version, duplicate emails are
 * practically eliminated.
 *
 * @param {Object} event The Cloud Pub/Sub event.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate((user, context) => {
  const eventId = context.eventId;
  const emailRef = db.collection('sentEmails').doc(eventId);

  const email = user.email; // The email of the user.
  const displayName = user.displayName; // The display name of the user.

  return shouldSend(emailRef)
    .then(send => {
      if (send) {
        /*
      Send welcome email
      */

        const scheduled = Math.floor(Date.now() / 1000);

        console.log(log_context, 'Scheduling delivery at', scheduled);

        const msg = {
          to: email,
          from: 'gilad@gethuan.com',
          subject: 'Welcome to Huan!',
          sendAt: scheduled + 43 * 60,
          templateId: 'd-aeafadf96ea644fda78f463bb040983f'
        };

        sgMail
          .send(msg)
          .then(() => {
            console.log(log_context, 'Sent welcome email to ', email);
          })
          .catch(e => {
            console.error(
              log_context,
              'Unable to send welcome email to',
              email,
              e.toString()
            );
          });

        return markSent(emailRef);
      }
    })
    .then(() => {
      /** */
    });
});

exports.sendRewardConfirmationEmail = functions.firestore
  .document('Redeem/{redeem}')
  .onCreate((redeem, context) => {
    const eventId = context.eventId;
    const emailRef = db.collection('sentEmails').doc(eventId);

    const data = redeem.data();

    const email = data.email; // The email of the user.
    const displayName = data.name; // The display name of the user.
    const reward_name = data.reward_name;
    const credits_redeemed = data.credits_redeemed;

    console.log(log_context, 'data', JSON.stringify(data));

    return shouldSend(emailRef)
      .then(send => {
        if (send) {
          const scheduled = Math.floor(Date.now() / 1000);

          console.log(log_context, 'Scheduling delivery at', scheduled);

          const msg = {
            to: email,
            from: 'info@gethuan.com',
            dynamic_template_data: {
              subject: 'Huan Rewards Confirmation',
              name: displayName,
              reward_name: reward_name,
              credits_redeemed: credits_redeemed
            },
            sendAt: scheduled,
            templateId: 'd-0c3360e903be41c2b571b2e5ea853cde'
          };

          sgMail
            .send(msg)
            .then(() => {
              console.log(log_context, 'Sent reward email to ', email);
            })
            .catch(e => {
              console.error(
                log_context,
                'Unable to send reward email to',
                email,
                e.toString()
              );
            });

          return markSent(emailRef);
        }
      })
      .then(() => {
        /** */
      });
  });

exports.sendOrderConfirmationEmail = functions.firestore
  .document('Orders/{order}')
  .onCreate((order, context) => {
    const eventId = context.eventId;
    const emailRef = db.collection('sentEmails').doc(eventId);

    const data = order.data();

    const email = data.email; // The email of the user.
    const displayName = data.name; // The display name of the user.
    const order_items = data.order_items;

    console.log(log_context, 'data', JSON.stringify(data));

    return shouldSend(emailRef)
      .then(send => {
        if (send) {
          const scheduled = Math.floor(Date.now() / 1000);

          console.log(log_context, 'Scheduling delivery at', scheduled);

          const msg = {
            to: email,
            from: 'info@gethuan.com',
            dynamic_template_data: {
              subject: 'Huan Order Confirmation',
              name: displayName,
              items: order_items
            },
            sendAt: scheduled,
            templateId: 'd-5c5fd05b2cdc464cadc4d357718bd158'
          };

          sgMail
            .send(msg)
            .then(() => {
              console.log(log_context, 'Sent confirmation email to ', email);
            })
            .catch(e => {
              console.error(
                log_context,
                'Unable to send confirmation email to',
                email,
                e.toString()
              );
            });

          // Send a copy to admin

          const admin_msg = {
            to: 'gilad@gethuan.com',
            from: 'contact@gethuan.com',
            dynamic_template_data: {
              subject: 'New Order Received',
              name: displayName,
              items: order_items
            },
            sendAt: scheduled,
            templateId: 'd-55299b2f47984a00a006c29cb4570b66'
          };

          sgMail
            .send(admin_msg)
            .then(() => {
              console.log(log_context, 'Sent confirmation copy to ', email);
            })
            .catch(e => {
              console.error(
                log_context,
                'Unable to send confirmation email to',
                email,
                e.toString()
              );
            });

          return markSent(emailRef);
        }
      })
      .then(() => {
        /** */
      });
  });

/**
 * Returns true if the given email has not yet been recorded as sent in Cloud
 * Firestore; otherwise, returns false.
 *
 * @param {!firebase.firestore.DocumentReference} emailRef Cloud Firestore
 *     reference to the email.
 * @returns {boolean} Whether the email should be sent by the current function
 *     execution.
 */
function shouldSend(emailRef) {
  return emailRef.get().then(emailDoc => {
    return !emailDoc.exists || !emailDoc.data().sent;
  });
}

/**
 * Records the given email as sent in Cloud Firestore.
 *
 * @param {!firebase.firestore.DocumentReference} emailRef Cloud Firestore
 *     reference to the email.
 * @returns {!Promise} Promise which indicates that the data has successfully
 *     been recorded in Cloud Firestore.
 */
function markSent(emailRef) {
  return emailRef.set({ sent: true });
}

exports.createReport = functions.firestore
  .document('Reports/{report}')
  .onCreate(report => {
    console.log(
      log_context,
      'New report submitted: ' + JSON.stringify(report.data())
    );

    let title, body;

    return true;
  });

exports.updateTag = functions.firestore
  .document('Tags/{tagId}')
  .onUpdate(update => {
    let message;
    const tag = update.after.data();
    const previous = update.before.data();

    // Elapsed time from last time tag was seen
    var delta_seconds;

    // Try to get delta using server timestamps, and fallback into old format
    try {
      delta_seconds =
        (Number(tag.lastseen.toDate()) - Number(previous.lastseen.toDate())) /
        1000;
    } catch (e) {
      delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
    }

    // Calculate distance from last known location
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
      log_context,
      'Tag %s seen by %s time delta: %s meters from last: %s',
      tag.tagId,
      tag.lastseenBy,
      // tag.lastseen,
      // previous.lastseen,
      delta_seconds,
      distance
    );

    // Get tag owner settings
    console.log(log_context, JSON.stringify(tag));

    try {
      admin
        .firestore()
        .collection('Users')
        .doc(tag.uid[0])
        .get()
        .then(doc => {
          handleTag(tag, previous, doc);
        })
        .catch(err => {
          console.error(
            log_context,
            '[Tag ' +
              tag.tagId +
              '] Unable to get owner settings: ' +
              JSON.stringify(err),
            JSON.stringify(tag.uid)
          );
        });
    } catch {
      admin
        .firestore()
        .collection('Users')
        .doc(tag.uid)
        .get()
        .then(doc => {
          handleTag(tag, previous, doc);
        })
        .catch(err => {
          console.error(
            log_context,
            'Unable to get owner settings: ' + JSON.stringify(err)
          );
        });
    }

    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost && tag.lost !== 'seen') {
      if (tag.lost) {
        message = tag.name + ' is missing!';
      } else {
        message = tag.name + ' was found!';
      }

      client.messages
        .create({
          body: message + ` (Tag ${tag.tagId})`,
          from: sms_orig,
          to: sms_dest
        })
        .then(msg =>
          console.log(log_context, 'Sent SMS to ' + sms_dest, msg.sid)
        )
        .catch(e => {
          console.error(log_context, 'Unable to send SMS', e);
        });

      getCommunity(tag.location)
        .then(place => {
          let body = 'Near ' + place.location;

          sendNotificationToTopic(
            place.community,
            tag,
            message,
            body,
            tag.location,
            'lost_pet'
          )
            .then(() => {
              console.log(log_context, 'Notification sent');
            })
            .catch(() => {
              console.error(log_context, 'Unable to send notification');
            });
        })
        .catch(e => {
          console.error(log_context, 'Unable to get community name: ' + e);
        });
    }

    return true;
  });

function handleTag(tag, previous, doc) {
  let message;
  const settings = doc.data().settings;
  const account = doc.data().account;

  // Elapsed time from last time tag was seen
  var delta_seconds;

  // Try to get delta using server timestamps, and fallback into old format
  try {
    delta_seconds =
      (Number(tag.lastseen.toDate()) - Number(previous.lastseen.toDate())) /
      1000;
  } catch (e) {
    delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
  }
  // Calculate distance from last known location
  const new_location = tag.location.split(',');
  const old_location = previous.location.split(',');

  const distance =
    distanceInKmBetweenEarthCoordinates(
      new_location[0],
      new_location[1],
      old_location[0],
      old_location[1]
    ) * 1000;

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
    )
      .then(() => {
        console.log(log_context, 'Notification sent');
      })
      .catch(() => {
        console.error(log_context, 'Unable to send notification');
      });
  }
  // XXX FIXME: XXX
  // Make sure this is the right scenario
  // XXX FIXME: XXX
  // If tag has been scanned by someone other than the owner VERY close to home, don't send a notification
  let distance_from_home = -1;
  let old_distance_from_home = -1;

  if (account.address_coords !== undefined) {
    const home_location = account.address_coords.split(',');
    distance_from_home =
      distanceInKmBetweenEarthCoordinates(
        new_location[0],
        new_location[1],
        home_location[0],
        home_location[1]
      ) * 1000;

    old_distance_from_home =
      distanceInKmBetweenEarthCoordinates(
        old_location[0],
        old_location[1],
        home_location[0],
        home_location[1]
      ) * 1000;
  }

  console.log(
    log_context,
    `Tag ${tag.tagId} location: ${tag.location}/Old Location: ${
      previous.location
    }/ was ${distance}m, now ${distance_from_home}m from home`
  );

  // IF  tag has been scanned by someone other than the owner,
  // AND at a new place
  // AND at least 45 minutes have passed (FIXME: Find way to optimize this)
  // AND that place is more than 100m away from home
  // THEN proceed

  console.log(
    log_context,
    'tag.uid.indexOf: ',
    tag.uid.indexOf(tag.lastseenBy),
    'tag.lastseenBy: ',
    tag.lastseenBy,
    'previous.lastseebBy: ',
    previous.lastseenBy,
    'delta_seconds: ',
    delta_seconds,
    'distance_from_home: ',
    distance_from_home,
    'old_distance_from_home: ',
    old_distance_from_home
  );

  if (
    (tag.uid.indexOf(tag.lastseenBy) === -1 &&
      tag.lastseenBy !== previous.lastseenBy &&
      delta_seconds > 2700 &&
      distance_from_home > 100) /* && old_distance_from_home > 100 */ ||
    tag.lost === true
  ) {
    // FIXME: Adjust distance and find a way to detect GPS errors (-/+ 3km)
    // Only alert if distance from old location is greater than 1km
    if (distance > 1000) {
      console.log(
        log_context,
        '%s has been scanned by someone else (uid: %s)! Notifying ' +
          account.displayName,
        tag.name,
        tag.lastseenBy
      );

      admin
        .firestore()
        .collection('Tags')
        .where('uid', 'array-contains', tag.lastseenBy)
        .limit(1)
        .get()
        .then(finder => {
          const location = tag.location.split(',');

          // Get tag address
          geocoder
            .reverse({ lat: location[0], lon: location[1] })
            .then(res => {
              var address;

              try {
                if (res[0] !== undefined) {
                  address = res[0].streetName + ' in ' + res[0].city;

                  console.log(log_context, 'Address: ' + address);
                } else {
                  address = 'unknown address';
                }
              } catch (error) {
                console.error(log_context, 'Unable to find address: ' + res);

                console.error(log_context, error);
                address = 'unknown address';
              }

              console.log(log_context, 'Retrieved address');

              // Notify owners
              sendNotification(
                tag,
                tag,
                tag.name + ' was just seen away from home!',
                'Near ' + address,
                'show_marker'
              )
                .then(() => {
                  console.log(log_context, 'Notification sent');
                })
                .catch(() => {
                  console.error(log_context, 'Unable to send notification');
                });

              console.log(log_context, JSON.stringify(finder.docs.length));

              // XXX
              // FIXME: Disable finder notification, transition to a manual notificaiton
              // XXX
              /*
              finder.docs.map(f => {
                console.log(log_context, f.data());

                // Notify finder
                const himher = tag.gender === 'Male' ? 'he' : 'she';

                sendNotification(
                  f.data(),
                  tag,
                  `${tag.name} is near, is ${himher} lost?`,
                  `Can you see ${tag.name}\'s owners?`,
                  'lost_pet'
                )
                  .then(() => {
                    console.log(log_context, 'Notification sent');
                  })
                  .catch(() => {
                    console.error(log_context, 'Unable to send notification');
                  });
                  
              });
              */
            })
            .catch(err => {
              if (err) {
                console.error(
                  log_context,
                  'Reverse Geocoding failed: ' + JSON.stringify(err)
                );
              }
            });
        })
        .catch(err => {
          console.error(
            log_context,
            'Unable to get finder info: ' + JSON.stringify(err)
          );
        });
    }

    // If tag is marked as lost, send a notification
    if (tag.lost === true && previous.lost === true) {
      console.log(
        log_context,
        '%s has been found! Notifying owners.',
        tag.name
      );

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
            log_context,
            'Unable to update tag status: ' + JSON.stringify(err)
          );
        });

      const location = tag.location.split(',');

      // Get tag address
      geocoder
        .reverse({ lat: location[0], lon: location[1] })
        .then(res => {
          var address;

          console.log(log_context, JSON.stringify(res));

          try {
            if (res[0] !== undefined) {
              address = res[0].formattedAddress;

              console.log(log_context, 'Address: ' + address);
            } else {
              address = 'unknown address';
            }
          } catch (error) {
            console.error(log_context, 'Unable to find address: ' + res);

            console.error(log_context, error);
            address = 'Unknown address';
          }

          console.log(log_context, 'Retrieved address');

          // Notify owners
          message = tag.name + ' was just seen!';
          sendNotification(tag, tag, message, 'Near ' + address, 'show_marker')
            .then(() => {
              console.log(log_context, 'Notification sent');
            })
            .catch(() => {
              console.error(log_context, 'Unable to send notification');
            });
        })
        .catch(err => {
          if (err) {
            console.error(
              log_context,
              'Reverse Geocoding failed: ' + JSON.stringify(err)
            );
          }
        });

      // Notify finder
      admin
        .firestore()
        .collection('Tags')
        .where('uid', 'array-contains', tag.lastseenBy)
        .limit(1)
        .get()
        .then(querySnapshot => {
          querySnapshot.forEach(finder => {
            console.log(log_context, JSON.stringify(finder.data()));
            sendNotification(
              finder.data(),
              tag,
              'Heads up! A lost pet is nearby.',
              tag.name + ` (${tag.breed}//${tag.color}//${tag.size})`,
              'lost_pet'
            )
              .then(() => {
                console.log(log_context, 'Notification sent');
              })
              .catch(() => {
                console.error(log_context, 'Unable to send notification');
              });
          });
        })
        .catch(err => {
          console.error(
            log_context,
            'Unable to get finder info: ' + JSON.stringify(err)
          );
        });
    }
  }
}

// Function to push notification to a device.
function sendNotificationToTopic(
  destination,
  tag,
  title,
  body,
  location,
  func = ''
) {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
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
        location: location,
        title: title,
        body: body,
        function: func
      }
    };

    console.log(
      log_context,
      'Sending Notifications: ' + JSON.stringify(payload) + ' to ' + destination
    );

    // XXX FIXME: XXX
    // RE ENABLE AFTER TESTING
    // XXX FIXME: XXX

    admin
      .messaging()
      .sendToTopic(destination, payload)
      .then(function(response) {
        console.log(
          log_context,
          'Successfully sent message:',
          JSON.stringify(response)
        );

        addTopicNotificationsToDb(destination, payload)
          .then(() => {
            console.log(log_context, 'Added notification to DB');
          })
          .catch(err => {
            console.error(log_context, err);
          });

        resolve(response);
      })
      .catch(function(error) {
        console.log(
          log_context,
          'Error sending message:',
          JSON.stringify(error)
        );
        reject(error);
      });

    // XXX FIXME: XXX
    // RE ENABLE AFTER TESTING
    // XXX FIXME: XXX
  });
}

// Function to push notification to a device.
function sendNotification(destination, tag, title, body, func = '') {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    console.log(log_context, 'destination: ', JSON.stringify(destination));

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
        log_context,
        'Sending Notifications: ' +
          JSON.stringify(message) +
          ' to ' +
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
            console.log('Successfully sent message:', response);

            // Add notification to the User's Notification collection
            addNotificationToDB(owner.uid, message)
              .then(() => {
                console.log(log_context, 'Added notification to DB');
              })
              .catch(err => {
                console.error(log_context, err);
              });

            resolve(response);
          })
          .catch(error => {
            console.log('Error sending message:', error);
            reject(error);
          });
      }
      /*
      admin
        .messaging()
        .sendToDevice(owner.token, payload, {
          contentAvailable: true,
          mutableContent: true
        })
        .then(response => {
          console.log(
            log_context,
            'Successfully sent message',
            payload,
            ' to ',
            owner.token,
            JSON.stringify(response)
          );

          // Add notification to the User's Notification collection
          addNotificationToDB(owner.uid, payload)
            .then(() => {
              console.log(log_context, 'Added notification to DB');
            })
            .catch(err => {
              console.error(log_context, err);
            });

          resolve(response);
        })
        .catch(error => {
          console.log(
            log_context,
            'Error sending message:',
            JSON.stringify(error)
          );
          reject(error);
        });
        */
    });
  });
}

function addNotificationToDB(uid, payload) {
  // Update the tag status to prevent repeating notifications
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise<any>((resolve, reject) => {
    admin
      .firestore()
      .collection('Users')
      .doc(uid)
      .collection('notifications')
      .doc(Date.now().toString())
      .set({
        payload: payload
      })
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        console.error(
          log_context,
          'Unable to update tag status: ' + JSON.stringify(err)
        );
        reject(err);
      });
  });
}

function addTopicNotificationsToDb(topic, payload) {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise<any>((resolve, reject) => {
    admin
      .firestore()
      .collection('Users')
      .where('settings.communityNotificationString', '==', topic)
      .get()
      .then(docs => {
        docs.forEach(doc => {
          doc.ref
            .collection('notifications')
            .doc(Date.now().toString())
            .set({
              payload: payload
            })
            .then(res => {
              resolve(res);
            })
            .catch(err => {
              console.error(
                log_context,
                'Unable to perform batch write to db: ' + JSON.stringify(err)
              );
              reject(err);
            });
        });
      })
      .catch(err => {
        console.error(
          log_context,
          'Unable to locate matching documents: ' + JSON.stringify(err)
        );
      });
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
            console.log(
              log_context,
              'Place id: ' + data[0].extra.googlePlaceId
            );

            placeId = data[0].extra.googlePlaceId;
          } else {
            placeId = null;
          }

          resolve(placeId);
        } catch (error) {
          console.error(log_context, data);
          console.error(log_context, error);

          placeId = null;
          reject(null);
        }
      })
      .catch(err => {
        if (err) {
          console.error(
            log_context,
            'Unable to get place id: ' + JSON.stringify(err)
          );
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
        console.log(log_context, data);

        let community = `${data[0].extra.neighborhood} ${
          data[0].administrativeLevels.level1short
        } ${data[0].countryCode}`;

        community = community.split(' ').join('_');

        community = lodash.deburr(community);

        try {
          const report_location = data[0].streetName;

          console.log(log_context, 'Community: ' + community);
          console.log(log_context, 'Loation: ' + report_location);

          resolve({
            community: community,
            location: report_location
          });
        } catch (error) {
          console.error(log_context, data);
          console.error(log_context, error);

          reject(null);
        }
      })
      .catch(err => {
        if (err) {
          console.error(
            log_context,
            'Unable to get community id: ' + JSON.stringify(err)
          );
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

  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(_lat1) * Math.cos(_lat2);

  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}
