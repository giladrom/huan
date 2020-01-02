"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const lodash = require("lodash");
const moment = require("moment-timezone");
var twilio = require("twilio");
var sgMail = require("@sendgrid/mail");
var NodeGeocoder = require("node-geocoder");
var WPAPI = require("wpapi");
// var options: any = {
//   provider: 'google',
//   httpAdapter: 'https',
//   apiKey: 'AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk',
//   formatter: null
// };
var geocoder = NodeGeocoder({
    provider: "google",
    httpAdapter: "https",
    apiKey: "AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk",
    formatter: null
});
const accountSid = "ACc953b486792eb66808eec0c06066d99c"; // Your Account SID from www.twilio.com/console
const authToken = "27afe27991de2ca1567cf0cfcc697cd0"; // Your Auth Token from www.twilio.com/console
const sms_orig = "+13108818847";
const sms_dest = "+18189628603";
const client = new twilio(accountSid, authToken);
sgMail.setApiKey("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");
//////////////////////
// INIT WOOCOMMERCE //
//////////////////////
const escapeHtml = require("escape-html");
const express = require("express");
const cors = require("cors");
const app = express();
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const WooCommerce = new WooCommerceRestApi({
    url: "https://gethuan.com",
    consumerKey: "ck_3dfb9f2bb3aa57a66d2a0d288489dee2c11f3f54",
    consumerSecret: "cs_a04586bcbdf544140e27418f036e2e09036aae92",
    version: "wc/v3",
    queryStringAuth: true // Force Basic Authentication as query string true and using under HTTPS
});
//////////////////////
// INIT CRYPTO      //
//////////////////////
const simple_crypto_js_1 = require("simple-crypto-js");
var _secretKey = "F5WJdcNJ1V@EcqSGXZZj";
var simpleCrypto = new simple_crypto_js_1.default(_secretKey);
//////////////////////
// INIT TWIT        //
//////////////////////
var Twit = require("twit");
var T = new Twit({
    consumer_key: "ivIbMZjILEIAiyNHOs8ZFH6S9",
    consumer_secret: "MtpixDyPZ8NHIbqt8E4XpxuXlTxqdDZYu6fmQx35sRa9VnBMf4",
    access_token: "1024933013992300545-Z7GJ6HCvuZaMVAbKHUVNFbKWjTLdQS",
    access_token_secret: "8r1mi1voiFfSKinijSRwYo7XYoOuGxbdisdwmdKOVdiZk",
    timeout_ms: 60 * 1000,
    strictSSL: true // optional - requires SSL certificates to be valid.
});
// Initialize Firebase Admin SDK
// admin.initializeApp(functions.config().firebase);
admin.initializeApp();
const db = admin.firestore();
const log_context = moment().format("x");
/*
 * Pub/Sub-triggered function which simulates sending (or actually sends) an
 * email before calling a flaky service. In this version, duplicate emails are
 * practically eliminated.
 *
 * @param {Object} event The Cloud Pub/Sub event.
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate((user, context) => {
    const eventId = context.eventId;
    const emailRef = db.collection("sentEmails").doc(eventId);
    const email = user.email; // The email of the user.
    const displayName = user.displayName; // The display name of the user.
    return shouldSend(emailRef).then(send => {
        if (send) {
            /*
            Send welcome email
            */
            const scheduled = Math.floor(Date.now() / 1000);
            console.log(log_context, "Scheduling delivery at", scheduled);
            const msg = {
                to: email,
                from: "gilad@gethuan.com",
                subject: "Welcome to Huan!",
                sendAt: scheduled + 5 * 60,
                templateId: "d-aeafadf96ea644fda78f463bb040983f"
            };
            sgMail
                .send(msg)
                .then(() => {
                console.log(log_context, "Sent welcome email to ", email);
            })
                .catch(e => {
                console.error(log_context, "Unable to send welcome email to", email, e.toString());
            });
            return markSent(emailRef);
        }
    });
    // .then(() => {
    //   /** */
    // });
});
exports.sendRewardConfirmationEmail = functions.firestore
    .document("Redeem/{redeem}")
    .onCreate((redeem, context) => {
    const eventId = context.eventId;
    const emailRef = db.collection("sentEmails").doc(eventId);
    const data = redeem.data();
    const email = data.email; // The email of the user.
    const displayName = data.name; // The display name of the user.
    const reward_name = data.reward_name;
    const credits_redeemed = data.credits_redeemed;
    console.log(log_context, "data", JSON.stringify(data));
    return shouldSend(emailRef)
        .then(send => {
        if (send) {
            const scheduled = Math.floor(Date.now() / 1000);
            console.log(log_context, "Scheduling delivery at", scheduled);
            const msg = {
                to: email,
                from: "info@gethuan.com",
                dynamic_template_data: {
                    subject: "Huan Rewards Confirmation",
                    name: displayName,
                    reward_name: reward_name,
                    credits_redeemed: credits_redeemed
                },
                sendAt: scheduled,
                templateId: "d-0c3360e903be41c2b571b2e5ea853cde"
            };
            sgMail
                .send(msg)
                .then(() => {
                console.log(log_context, "Sent reward email to ", email);
            })
                .catch(e => {
                console.error(log_context, "Unable to send reward email to", email, e.toString());
            });
            return markSent(emailRef);
        }
    })
        .then(() => {
        /** */
    });
});
exports.sendOrderConfirmationEmail = functions.firestore
    .document("Orders/{order}")
    .onCreate((order, context) => {
    const eventId = context.eventId;
    const emailRef = db.collection("sentEmails").doc(eventId);
    const data = order.data();
    const email = data.email; // The email of the user.
    const displayName = data.name; // The display name of the user.
    const order_items = data.order_items;
    console.log(log_context, "data", JSON.stringify(data));
    return shouldSend(emailRef)
        .then(send => {
        if (send) {
            const scheduled = Math.floor(Date.now() / 1000);
            console.log(log_context, "Scheduling delivery at", scheduled);
            const msg = {
                to: email,
                from: "info@gethuan.com",
                dynamic_template_data: {
                    subject: "Huan Order Confirmation",
                    name: displayName,
                    items: order_items
                },
                sendAt: scheduled,
                templateId: "d-5c5fd05b2cdc464cadc4d357718bd158"
            };
            sgMail
                .send(msg)
                .then(() => {
                console.log(log_context, "Sent confirmation email to ", email);
            })
                .catch(e => {
                console.error(log_context, "Unable to send confirmation email to", email, e.toString());
            });
            // Send a copy to admin
            const admin_msg = {
                to: "gilad@gethuan.com",
                from: "contact@gethuan.com",
                dynamic_template_data: {
                    subject: "New Order Received",
                    name: displayName,
                    items: order_items
                },
                sendAt: scheduled,
                templateId: "d-55299b2f47984a00a006c29cb4570b66"
            };
            sgMail
                .send(admin_msg)
                .then(() => {
                console.log(log_context, "Sent confirmation copy to ", email);
            })
                .catch(e => {
                console.error(log_context, "Unable to send confirmation email to", email, e.toString());
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
function shouldAdd(eventRef) {
    return eventRef.get().then(eventDoc => {
        return !eventDoc.exists;
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
    .document("Reports/{report}")
    .onCreate(report => {
    console.log(log_context, "New report submitted: " + JSON.stringify(report.data()));
    let title, body;
    return true;
});
exports.onTagCreate = functions.firestore
    .document("Tags/{tagId}")
    .onCreate((tagData, context) => {
    const eventId = context.eventId;
    const triggerRef = db.collection("eventsTriggered").doc(eventId);
    const eventRef = db.collection("communityEvents").doc(eventId);
    const tag = tagData.data();
    // Using shouldSend from email functions to make sure we don't have duplicate entries
    return shouldSend(triggerRef)
        .then(send => {
        if (send) {
            if (!tag.tagattached) {
                getCommunityName(tag.location)
                    .then(community => {
                    eventRef
                        .set({
                        event: "new_pet",
                        name: tag.name,
                        img: tag.img,
                        community: community,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    })
                        .catch(e => {
                        console.error("Unable to add new event", e);
                    });
                })
                    .catch(e => {
                    console.error("Unable to get community name", e);
                });
            }
            return markSent(triggerRef);
        }
    })
        .then(() => {
        /** */
    });
});
exports.updateTag = functions.firestore
    .document("Tags/{tagId}")
    .onUpdate((update, context) => {
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
    }
    catch (e) {
        delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
    }
    // Calculate distance from last known location
    const new_location = tag.location.split(",");
    const old_location = previous.location.split(",");
    const distance = distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], old_location[0], old_location[1]) * 1000;
    console.log(log_context, "Tag %s seen by %s time delta: %s meters from last: %s", tag.tagId, tag.lastseenBy, 
    // tag.lastseen,
    // previous.lastseen,
    delta_seconds, distance);
    // Get tag owner settings
    console.log(log_context, JSON.stringify(tag));
    if (tag.img !== previous.img) {
        console.log("tag.img", tag.img, previous.img);
        addEventToDB(context, "new_pet_img", tag, "")
            .then(() => {
            console.log("Added new new_pet_img event to DB");
        })
            .catch(e => {
            console.error("Unable to add event to DB", e);
        });
    }
    try {
        admin
            .firestore()
            .collection("Users")
            .doc(tag.uid[0])
            .get()
            .then(doc => {
            handleTag(tag, previous, doc, context);
        })
            .catch(err => {
            console.error(log_context, "[Tag " +
                tag.tagId +
                "] Unable to get owner settings: " +
                JSON.stringify(err), JSON.stringify(tag.uid));
        });
    }
    catch (_a) {
        admin
            .firestore()
            .collection("Users")
            .doc(tag.uid)
            .get()
            .then(doc => {
            handleTag(tag, previous, doc, context);
        })
            .catch(err => {
            console.error(log_context, "Unable to get owner settings: " + JSON.stringify(err));
        });
    }
    // Notify if dog is marked as lost/found
    if (tag.lost !== previous.lost && tag.lost !== "seen") {
        getCommunity(tag.location)
            .then(place => {
            if (tag.lost) {
                message = tag.name + " is missing!";
                generateWPPost(tag)
                    .then(r => {
                    console.log("Generated WP Post", r.id);
                    tag.alert_post_url = "https://gethuan.com/" + r.slug;
                    admin
                        .firestore()
                        .collection("Tags")
                        .doc(tag.tagId)
                        .update({
                        alert_post_url: tag.alert_post_url
                    })
                        .catch(err => {
                        console.error(log_context, "Unable to update tag status: " + JSON.stringify(err));
                    });
                    tweet(`Missing Pet Alert! ${tag.name} is Missing: ${tag.alert_post_url}`)
                        .then(t => {
                        console.log("Post Tweet", t.id);
                    })
                        .catch(e => {
                        console.error(e);
                    });
                    addEventToDB(context, "pet_marked_as_lost", tag, place.town, tag.location)
                        .then(() => {
                        console.log("Added new pet_marked_as_lost event to DB");
                    })
                        .catch(e => {
                        console.error("Unable to add event to DB", e);
                    });
                })
                    .catch(e => {
                    console.error("Unable to generate WP Post", e);
                });
            }
            else {
                message = tag.name + " was found!";
                admin
                    .firestore()
                    .collection("Tags")
                    .doc(tag.tagId)
                    .update({
                    alert_post_url: ""
                })
                    .catch(err => {
                    console.error(log_context, "Unable to update tag status: " + JSON.stringify(err));
                });
                tweet(`${tag.name} was just reunited with their owners!`)
                    .then(t => {
                    console.log("Post Tweet", t.id);
                })
                    .catch(e => {
                    console.error(e);
                });
                addEventToDB(context, "pet_marked_as_found", tag, place.town)
                    .then(() => {
                    console.log("Added new pet_marked_as_found event to DB");
                })
                    .catch(e => {
                    console.error("Unable to add event to DB", e);
                });
            }
            const body = "Near " + place.location;
            sendNotificationToTopic(place.community, tag, message, body, tag.location, "lost_pet")
                .then(() => {
                console.log(log_context, "Notification sent");
            })
                .catch(() => {
                console.error(log_context, "Unable to send notification");
            });
            client.messages
                .create({
                body: message + ` (Tag ${tag.tagId})`,
                from: sms_orig,
                to: sms_dest
            })
                .then(msg => console.log(log_context, "Sent SMS to " + sms_dest, msg.sid))
                .catch(e => {
                console.error(log_context, "Unable to send SMS", e);
            });
        })
            .catch(e => {
            console.error(log_context, "Unable to get community name: " + e);
        });
        getCommunity(tag.location)
            .then(place => {
            if (tag.lost) {
                addEventToDB(context, "pet_marked_as_lost", tag, place.town, tag.location)
                    .then(() => {
                    console.log("Added new pet_marked_as_lost event to DB");
                })
                    .catch(e => {
                    console.error("Unable to add event to DB", e);
                });
            }
            else {
                addEventToDB(context, "pet_marked_as_found", tag, place.town)
                    .then(() => {
                    console.log("Added new pet_marked_as_found event to DB");
                })
                    .catch(e => {
                    console.error("Unable to add event to DB", e);
                });
            }
            const body = "Near " + place.location;
            sendNotificationToTopic(place.community, tag, message, body, tag.location, "lost_pet")
                .then(() => {
                console.log(log_context, "Notification sent");
            })
                .catch(() => {
                console.error(log_context, "Unable to send notification");
            });
        })
            .catch(e => {
            console.error(log_context, "Unable to get community name: " + e);
        });
    }
    return true;
});
function handleTag(tag, previous, doc, context) {
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
    }
    catch (e) {
        delta_seconds = Number(tag.lastseen - Number(previous.lastseen)) / 1000;
    }
    // Calculate distance from last known location
    const new_location = tag.location.split(",");
    const old_location = previous.location.split(",");
    const distance = distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], old_location[0], old_location[1]) * 1000;
    if (settings.tagNotifications) {
        sendNotification(tag, tag, "Huan Tag detected nearby!", "Tag " +
            tag.tagId +
            " has been detected after " +
            delta_seconds +
            " seconds")
            .then(() => {
            console.log(log_context, "Notification sent");
        })
            .catch(() => {
            console.error(log_context, "Unable to send notification");
        });
    }
    // XXX FIXME: XXX
    // Make sure this is the right scenario
    // XXX FIXME: XXX
    // If tag has been scanned by someone other than the owner VERY close to home, don't send a notification
    let distance_from_home = -1;
    let old_distance_from_home = -1;
    if (account.address_coords !== undefined) {
        const home_location = account.address_coords.split(",");
        distance_from_home =
            distanceInKmBetweenEarthCoordinates(new_location[0], new_location[1], home_location[0], home_location[1]) * 1000;
        old_distance_from_home =
            distanceInKmBetweenEarthCoordinates(old_location[0], old_location[1], home_location[0], home_location[1]) * 1000;
    }
    console.log(log_context, `Tag ${tag.tagId} location: ${tag.location}/Old Location: ${previous.location}/ was ${distance}m, now ${distance_from_home}m from home`);
    // IF  tag has been scanned by someone other than the owner,
    // AND at a new place
    // AND at least 45 minutes have passed (FIXME: Find way to optimize this)
    // AND that place is more than 100m away from home
    // THEN proceed
    console.log(log_context, "tag.uid.indexOf: ", tag.uid.indexOf(tag.lastseenBy), "tag.lastseenBy: ", tag.lastseenBy, "previous.lastseebBy: ", previous.lastseenBy, "delta_seconds: ", delta_seconds, "distance_from_home: ", distance_from_home, "old_distance_from_home: ", old_distance_from_home);
    let high_risk = false;
    let delta_seconds_threshold = 600;
    let distance_from_home_threshold = 200;
    let distance_threshold = 1600;
    try {
        if (tag.high_risk) {
            console.log(`Tag ${tag.tagId} High Risk Mode enabled`);
            high_risk = true;
            delta_seconds_threshold = 300;
            distance_from_home_threshold = 100;
            distance_threshold = 300;
        }
    }
    catch (e) { }
    if ((tag.uid.indexOf(tag.lastseenBy) === -1 &&
        tag.lastseenBy !== previous.lastseenBy &&
        delta_seconds > delta_seconds_threshold &&
        distance_from_home > distance_from_home_threshold) ||
        tag.lost === true) {
        // FIXME: Adjust distance and find a way to detect GPS errors (-/+ 3km)
        // Only alert if distance from old location is greater than 1km
        if (distance > distance_threshold) {
            console.log(log_context, "%s has been scanned by someone else (uid: %s)! Notifying " +
                account.displayName, tag.name, tag.lastseenBy);
            admin
                .firestore()
                .collection("Tags")
                .where("uid", "array-contains", tag.lastseenBy)
                .limit(1)
                .get()
                .then(finder => {
                const location = tag.location.split(",");
                // Get tag address
                geocoder
                    .reverse({ lat: location[0], lon: location[1] })
                    .then(res => {
                    var address;
                    try {
                        if (res[0].streetName !== undefined &&
                            res[0].city !== undefined) {
                            address = "Near " + res[0].streetName + " in " + res[0].city;
                            console.log(log_context, "Address: " + address);
                        }
                        else {
                            address = "unknown address";
                        }
                    }
                    catch (error) {
                        console.error(log_context, "Unable to find address: " + res);
                        console.error(log_context, error);
                        address = "unknown address";
                    }
                    console.log(log_context, "Retrieved address");
                    tweet(`${tag.name} was just detected by the Pet Protection Network! (In ${res[0].city})`)
                        .then(t => {
                        console.log("Post Tweet", t.id);
                    })
                        .catch(e => {
                        console.error(e);
                    });
                    addEventToDB(context, "pet_seen_away_from_home", tag, res[0].city == undefined ? "" : res[0].city)
                        .then(() => {
                        console.log("Event added to DB");
                    })
                        .catch(e => {
                        console.error("Cannot add event to DB", e);
                    });
                    // Notify owners
                    sendNotification(tag, tag, tag.name + " was just seen away from home!", address, "show_marker")
                        .then(() => {
                        console.log(log_context, "Notification sent");
                    })
                        .catch(() => {
                        console.error(log_context, "Unable to send notification");
                    });
                    // Send admin SMS
                    client.messages
                        .create({
                        body: tag.name + " was just seen away from home! Near " + address,
                        from: sms_orig,
                        to: sms_dest
                    })
                        .then(msg => console.log(log_context, "Sent SMS to " + sms_dest, msg.sid))
                        .catch(e => {
                        console.error(log_context, "Unable to send SMS", e);
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
                        console.error(log_context, "Reverse Geocoding failed: " + JSON.stringify(err));
                    }
                });
            })
                .catch(err => {
                console.error(log_context, "Unable to get finder info: " + JSON.stringify(err));
            });
        }
        // If tag is marked as lost, send a notification
        if (tag.lost === true && previous.lost === true) {
            console.log(log_context, "%s has been found! Notifying owners.", tag.name);
            // Update the tag status to prevent repeating notifications
            admin
                .firestore()
                .collection("Tags")
                .doc(tag.tagId)
                .update({
                lost: "seen"
            })
                .catch(err => {
                console.error(log_context, "Unable to update tag status: " + JSON.stringify(err));
            });
            const location = tag.location.split(",");
            // Get tag address
            geocoder
                .reverse({ lat: location[0], lon: location[1] })
                .then(res => {
                var address;
                console.log(log_context, JSON.stringify(res));
                try {
                    if (res[0].formattedAddress !== undefined) {
                        address = "Near " + res[0].formattedAddress;
                        console.log(log_context, "Address: " + address);
                    }
                    else {
                        address = "unknown address";
                    }
                }
                catch (error) {
                    console.error(log_context, "Unable to find address: " + res);
                    console.error(log_context, error);
                    address = "Unknown address";
                }
                console.log(log_context, "Retrieved address");
                // Notify owners
                message = tag.name + " was just seen!";
                sendNotification(tag, tag, message, address, "show_marker")
                    .then(() => {
                    console.log(log_context, "Notification sent");
                })
                    .catch(() => {
                    console.error(log_context, "Unable to send notification");
                });
            })
                .catch(err => {
                if (err) {
                    console.error(log_context, "Reverse Geocoding failed: " + JSON.stringify(err));
                }
            });
            // Notify finder
            admin
                .firestore()
                .collection("Tags")
                .where("uid", "array-contains", tag.lastseenBy)
                .limit(1)
                .get()
                .then(querySnapshot => {
                querySnapshot.forEach(finder => {
                    console.log(log_context, JSON.stringify(finder.data()));
                    sendNotification(finder.data(), tag, "Heads up! A lost pet is nearby.", tag.name + ` (${tag.breed}//${tag.color}//${tag.size})`, "lost_pet")
                        .then(() => {
                        console.log(log_context, "Notification sent");
                    })
                        .catch(() => {
                        console.error(log_context, "Unable to send notification");
                    });
                });
            })
                .catch(err => {
                console.error(log_context, "Unable to get finder info: " + JSON.stringify(err));
            });
        }
    }
}
// Function to push notification to a device.
function sendNotificationToTopic(destination, tag, title, body, location, func = "") {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        const payload = {
            notification: {
                title: title,
                body: body,
                sound: "default",
                clickAction: "FCM_PLUGIN_ACTIVITY",
                icon: "fcm_push_icon"
            },
            data: {
                tagId: tag.tagId,
                location: location,
                title: title,
                body: body,
                function: func
            }
        };
        console.log(log_context, "Sending Notifications: " + JSON.stringify(payload) + " to " + destination);
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
        admin
            .messaging()
            .sendToTopic(destination, payload)
            .then(function (response) {
            console.log(log_context, "Successfully sent message:", JSON.stringify(response));
            addTopicNotificationsToDb(destination, payload)
                .then(() => {
                console.log(log_context, "Added notification to DB");
            })
                .catch(err => {
                console.error(log_context, err);
            });
            resolve(response);
        })
            .catch(function (error) {
            console.log(log_context, "Error sending message:", JSON.stringify(error));
            reject(error);
        });
        // XXX FIXME: XXX
        // RE ENABLE AFTER TESTING
        // XXX FIXME: XXX
    });
}
// Function to push notification to a device.
function sendNotification(destination, tag, title, body, func = "") {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        console.log(log_context, "destination: ", JSON.stringify(destination));
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
            console.log(log_context, "Sending Notifications: " +
                JSON.stringify(message) +
                " to " +
                owner.token);
            // Send a message to the device corresponding to the provided
            // registration token.
            if (owner.token !== null) {
                admin
                    .messaging()
                    .send(message)
                    .then(response => {
                    // Response is a message ID string.
                    console.log("Successfully sent message:", response);
                    // Add notification to the User's Notification collection
                    addNotificationToDB(owner.uid, message)
                        .then(() => {
                        console.log(log_context, "Added notification to DB");
                    })
                        .catch(err => {
                        console.error(log_context, err);
                    });
                    resolve(response);
                })
                    .catch(error => {
                    console.log("Error sending message:", error);
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
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("Users")
            .doc(uid)
            .collection("notifications")
            .doc(Date.now().toString())
            .set({
            payload: payload
        })
            .then(res => {
            resolve(res);
        })
            .catch(err => {
            console.error(log_context, "Unable to update tag status: " + JSON.stringify(err));
            reject(err);
        });
    });
}
function addEventToDB(context, event, tag, community, data = "") {
    // Update the tag status to prevent repeating notifications
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        const eventId = context.eventId;
        const eventRef = db.collection("communityEvents").doc(eventId);
        console.log("Adding new event", event, eventId);
        shouldAdd(eventRef)
            .then(ev => {
            if (ev) {
                admin
                    .firestore()
                    .collection("communityEvents")
                    .doc(eventId)
                    .set({
                    event: event,
                    name: tag.name,
                    img: tag.img,
                    url: tag.alert_post_url || "",
                    community: community,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    data: data
                })
                    .then(res => {
                    resolve(true);
                })
                    .catch(err => {
                    console.error(log_context, "Unable to add event: " + JSON.stringify(err));
                    reject(err);
                });
            }
            else {
                console.error("Event already exists", event, eventId);
            }
        })
            .catch(e => {
            console.error(e);
        });
    });
}
function addTopicNotificationsToDb(topic, payload) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("Users")
            .where("settings.communityNotificationString", "==", topic)
            .get()
            .then(docs => {
            docs.forEach(doc => {
                doc.ref
                    .collection("notifications")
                    .doc(Date.now().toString())
                    .set({
                    payload: payload
                })
                    .then(res => {
                    resolve(res);
                })
                    .catch(err => {
                    console.error(log_context, "Unable to perform batch write to db: " + JSON.stringify(err));
                    reject(err);
                });
            });
        })
            .catch(err => {
            console.error(log_context, "Unable to locate matching documents: " + JSON.stringify(err));
        });
    });
}
function getPlaceId(location) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        const loc = location.split(",");
        let placeId;
        // Get tag address
        geocoder
            .reverse({ lat: loc[0], lon: loc[1] })
            .then(data => {
            try {
                if (data[0] !== undefined) {
                    console.log(log_context, "Place id: " + data[0].extra.googlePlaceId);
                    placeId = data[0].extra.googlePlaceId;
                }
                else {
                    placeId = null;
                }
                resolve(placeId);
            }
            catch (error) {
                console.error(log_context, data);
                console.error(log_context, error);
                placeId = null;
                reject(null);
            }
        })
            .catch(err => {
            if (err) {
                console.error(log_context, "Unable to get place id: " + JSON.stringify(err));
            }
            reject(err);
        });
    });
}
function getCommunity(location) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        const loc = location.split(",");
        geocoder
            .reverse({ lat: loc[0], lon: loc[1] })
            .then(data => {
            console.log(log_context, data);
            let community = `${data[0].extra.neighborhood} ${data[0].administrativeLevels.level1short} ${data[0].countryCode}`;
            community = community.split(" ").join("_");
            community = lodash.deburr(community);
            try {
                const report_location = data[0].streetName;
                console.log(log_context, "Community: " + community);
                console.log(log_context, "Loation: " + report_location);
                resolve({
                    community: community,
                    town: `${data[0].extra.neighborhood} ${data[0].administrativeLevels.level1short}`,
                    location: report_location
                });
            }
            catch (error) {
                console.error(log_context, data);
                console.error(log_context, error);
                reject(null);
            }
        })
            .catch(err => {
            if (err) {
                console.error(log_context, "Unable to get community id: " + JSON.stringify(err));
            }
            reject(err);
        });
    });
}
function getCommunityName(location) {
    // tslint:disable-next-line:no-shadowed-variable
    return new Promise((resolve, reject) => {
        const loc = location.split(",");
        geocoder
            .reverse({ lat: loc[0], lon: loc[1] })
            .then(data => {
            console.log(log_context, data);
            const community = `${data[0].extra.neighborhood} ${data[0].administrativeLevels.level1short}`;
            try {
                resolve(community);
            }
            catch (error) {
                console.error(log_context, data);
                console.error(log_context, error);
                reject(null);
            }
        })
            .catch(err => {
            if (err) {
                console.error(log_context, "Unable to get community: " + JSON.stringify(err));
            }
            reject(err);
        });
    });
}
function tweet(status) {
    return new Promise((resolve, reject) => {
        T.post("statuses/update", {
            status: status
        })
            .then(data => {
            resolve(data);
        })
            .catch(e => {
            reject(e);
        });
    });
}
function generateWPPost(tag) {
    return new Promise((resolve, reject) => {
        const wp = new WPAPI({
            endpoint: "https://gethuan.com/wp-json",
            username: "dogbot",
            password: "fOmz Gv4B LU0p eci9 Kem5 YG0O"
        });
        var lastseen = moment(tag.markedlost.toDate())
            .tz("America/Los_Angeles")
            .format("MMMM Do YYYY, h:mm a z");
        const location = tag.location.split(",");
        geocoder.reverse({ lat: location[0], lon: location[1] }).then(res => {
            var address;
            try {
                if (res[0].streetName !== undefined && res[0].city !== undefined) {
                    address = "Near " + res[0].streetName + " in " + res[0].city;
                }
                else {
                    address = "Unknown address";
                }
            }
            catch (error) {
                address = "Unknown address";
            }
            const himher = tag.gender === "Male" ? "him" : "her";
            wp.posts()
                .create({
                slug: randomIntFromInterval(111, 999) +
                    "/" +
                    "missing-pet-alert-" +
                    tag.name.replace(" ", "-"),
                title: `Missing Pet Alert: ${tag.name} (${res[0].city}, ${res[0].administrativeLevels.level1short})`,
                content: `<h2 style=\"text-align: center;\">${tag.name} has been missing since ${lastseen}. Last seen ${address}.</h2>\n\n` +
                    `<p><img class=\"aligncenter\" src="${tag.img}" alt="Image of ${tag.name}" width="510" height="512" /></p>\n` +
                    `<ul>\n<li>${tag.size} ${tag.gender} ${tag.breed}</li>\n<li>Fur Color: ${tag.color}</li>\n<li>Character: ${tag.character}</li>\n<li>Remarks: ${tag.remarks}</li>\n</ul>\n` +
                    `<p>Please help us find ${tag.name} by installing the Huan App and joining our network. ${tag.name} is wearing a Huan Bluetooth tag - You could be the one who picks up the signal!</p>\n` +
                    `<p><strong>Share this post on social media and help ${tag.name} return home!</strong></p>\n`,
                excerpt: `${tag.name} has been missing since ${lastseen}. Last seen ${address}.`,
                author: 54,
                format: "standard",
                categories: [136],
                status: "publish",
                featured_media: 12921
            })
                .then(response => {
                resolve(response);
            })
                .catch(e => {
                reject(e);
            });
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
// HTTPS endpoint for coupon genreation
// Automatically allow cross-origin requests
// app.use(cors({ origin: true }));
// app.get("/get_referral_count", (req, res) => {
//   res.end("Received GET request!");
// });
// app.post("/generate_referral_code", (req, res) => {
//   res.end("Received POST request!");
// });
// Expose Express API as a single Cloud Function:
// exports.coupons = functions.https.onRequest(app);
function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function checkReferralCode(uid, account, name) {
    return new Promise((resolve, reject) => {
        const code = String(name).toUpperCase() + randomIntFromInterval(1, 99);
        console.log("checkReferralCode(): Trying", code);
        return admin
            .firestore()
            .collection("Users")
            .where("account.coupon", "==", code)
            .get()
            .then(doc => {
            if (doc.empty) {
                console.log("checkReferralCode():", code, "is available");
                account.coupon = code;
                admin
                    .firestore()
                    .collection("Users")
                    .doc(uid)
                    .update({
                    account: account
                })
                    .then(() => {
                    console.log("checkReferralCode():", code, "is set for", uid);
                    resolve(code);
                })
                    .catch(e => {
                    reject(e);
                    console.error(e);
                });
            }
            else {
                console.log("checkReferralCode():", code, "is taken");
                resolve(checkReferralCode(uid, account, name));
            }
        })
            .catch(e => {
            console.error(e);
        });
    });
}
exports.getReferralCount = functions.https.onCall((data, context) => {
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    const coupon = data.coupon;
    console.log(coupon);
    return WooCommerce.get("coupons", { search: coupon })
        .then(response => {
        console.log("WooCommerce Details Reply", JSON.stringify(response.data));
        return { message: response.data, code: 200 };
    })
        .catch(error => {
        console.log("WooCommerce Details Error", JSON.stringify(error));
        return { message: error.response.data, code: 500 };
    });
});
exports.generateReferralCode = functions.https.onCall((data, context) => {
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    const uid = context.auth.uid;
    const query = data.query;
    var userData;
    return admin
        .firestore()
        .collection("Users")
        .doc(uid)
        .get()
        .then(doc => {
        const account = doc.data().account;
        if (account.coupon) {
            console.log("Found existing coupon code for", uid);
            return { message: account.coupon, code: 200 };
        }
        else {
            console.log("Generating WooCommerce coupon code for", uid);
            const coupon = account.displayName.split(" ")[0];
            console.log("Attempting coupon", coupon);
            return checkReferralCode(uid, account, coupon)
                .then(r => {
                console.log("checkReferralCode has returned", r);
                // Added coupon to the user's account, now create it in WooCommerce
                const coupon_data = {
                    create: [
                        {
                            code: r,
                            discount_type: "recurring_percent",
                            amount: "5",
                            individual_use: true,
                            exclude_sale_items: true,
                            usage_limit: 200,
                            usage_limit_per_user: 1,
                            meta_data: [
                                {
                                    id: 50915,
                                    key: "_wc_url_coupons_unique_url",
                                    value: "coupons/" + r
                                },
                                // {
                                //   id: 50916,
                                //   key: "_wc_url_coupons_redirect_page",
                                //   value: "3347"
                                // },
                                // {
                                //   id: 50966,
                                //   key: "_wc_url_coupons_product_ids",
                                //   value: [9178]
                                // },
                                // {
                                //   id: 50982,
                                //   key: "_wc_url_coupons_redirect_page_type",
                                //   value: "page"
                                // },
                                {
                                    id: 50984,
                                    key: "_wcs_number_payments",
                                    value: ""
                                }
                            ]
                        }
                    ]
                };
                return WooCommerce.post("coupons/batch", coupon_data)
                    .then(response => {
                    console.log("WooCommerce Reply", JSON.stringify(response.data));
                    // logger.info({ message: 'WooCommerce Reply: ' + JSON.stringify(response.data) });
                    if (response.data.create[0]) {
                        if (response.data.create[0].error &&
                            response.data.create[0].error.message ===
                                "The coupon code already exists") {
                            return { message: r, code: 200 };
                        }
                        else {
                            console.log(response.data);
                            console.log("WooCommerce coupons created successfully");
                            return { message: r, code: 200 };
                        }
                    }
                    else {
                        console.log(response.data);
                        return { message: r, code: 200 };
                    }
                })
                    .catch(error => {
                    console.log("WooCommerce Error", JSON.stringify(error));
                    return { message: r, code: 401 };
                });
            })
                .catch(e => {
                console.error(e);
                return { message: JSON.stringify(e), code: 401 };
            });
        }
    })
        .catch(err => {
        console.error(JSON.stringify(err));
        return { message: JSON.stringify(err), code: 401 };
    });
    // return { message: "Some Data", code: 200 };
});
exports.getHeatCoordinates = functions.https.onCall((data, context) => {
    var coords = [];
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("Tags")
            .where("tagattached", "==", true)
            .get()
            .then(querySnapshot => {
            let itemsProcessed = 0;
            console.log("Processing", querySnapshot.size, "items");
            querySnapshot.forEach(tag => {
                itemsProcessed++;
                const latlng = tag.data().location.split(",");
                coords.push([latlng[0], latlng[1], 1]);
                if (itemsProcessed === querySnapshot.size) {
                    resolve({
                        message: simpleCrypto.encrypt(coords),
                        code: 200
                    });
                }
            });
        })
            .catch(e => {
            console.error(e);
            resolve({
                message: e,
                code: 500
            });
        });
    });
});
exports.getLatestUpdateLocation = functions.https.onCall((data, context) => {
    var coords = [];
    const beginningDate = Date.now() - 3907200000; // 45 days in milliseconds
    const beginningDateObject = new Date(beginningDate);
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("Tags")
            .where("tagattached", "==", true)
            .where("lastseen", ">", beginningDateObject)
            .orderBy("lastseen", "desc")
            .limit(30)
            .get()
            .then(querySnapshot => {
            let itemsProcessed = 0;
            querySnapshot.forEach(tag => {
                itemsProcessed++;
                // tslint:disable-next-line:prefer-const
                let latlng = tag.data().location.split(",");
                latlng[0] = parseFloat(latlng[0]).toFixed(2);
                latlng[1] = parseFloat(latlng[1]).toFixed(2);
                coords.push(latlng);
                if (itemsProcessed === querySnapshot.size) {
                    // getCommunityName(tag.data().location)
                    //   .then(location => {
                    resolve({
                        message: simpleCrypto.encrypt({
                            latlng: coords,
                            location: "" //location
                        }),
                        code: 200
                    });
                    // })
                    // .catch(e => {
                    //   console.error(e);
                    //   resolve({
                    //     message: e,
                    //     code: 500
                    //   });
                    // });
                }
            });
        })
            .catch(e => {
            console.error(e);
            resolve({
                message: e,
                code: 500
            });
        });
    });
});
exports.getNetworkStats = functions.https.onCall((data, context) => {
    const beginningDate = Date.now() - 86400000; // 1 day in milliseconds
    const beginningDateObject = new Date(beginningDate);
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("communityEvents")
            .where("event", "==", "pet_seen_away_from_home")
            .where("timestamp", ">", beginningDateObject)
            .get()
            .then(querySnapshot => {
            resolve({
                message: simpleCrypto.encrypt({
                    pet_seen_away_from_home: querySnapshot.size
                }),
                code: 200
            });
        })
            .catch(e => {
            console.error(e);
            resolve({
                message: e,
                code: 500
            });
        });
    });
});
exports.getLatestNetworkEvents = functions.https.onCall((data, context) => {
    const beginningDate = Date.now() - 86400000; // 1 day in milliseconds
    const beginningDateObject = new Date(beginningDate);
    let events = [];
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    return new Promise((resolve, reject) => {
        admin
            .firestore()
            .collection("communityEvents")
            .where("timestamp", ">", beginningDateObject)
            .orderBy("timestamp", "desc")
            .get()
            .then(querySnapshot => {
            let itemsProcessed = 0;
            querySnapshot.forEach(event => {
                itemsProcessed++;
                let e = event.data();
                e.timestamp = e.timestamp.toDate();
                events.push(e);
                if (itemsProcessed === querySnapshot.size) {
                    resolve({
                        message: simpleCrypto.encrypt({
                            events: events
                        }),
                        code: 200
                    });
                }
            });
        })
            .catch(e => {
            console.error(e);
            resolve({
                message: e,
                code: 500
            });
        });
    });
});
exports.bulkUpdateTags = functions.https.onCall((data, context) => {
    // verify Firebase Auth ID token
    if (!context.auth) {
        return { message: "Authentication Required!", code: 401 };
    }
    return new Promise((resolve, reject) => {
        const collection = admin.firestore().collection("Tags");
        const tags = data.tagData;
        let i = 0;
        tags.forEach(tag => {
            i++;
            collection
                .doc(tag.minor.toString())
                .update({
                location: data.location,
                lastseen: admin.firestore.FieldValue.serverTimestamp(),
                lastseenBy: data.uid,
                accuracy: tag.accuracy,
                proximity: tag.proximity,
                rssi: tag.rssi
            })
                .then(querySnapshot => {
                resolve({
                    message: "OK",
                    code: 200
                });
            })
                .catch(e => {
                resolve({
                    message: e,
                    code: 500
                });
            });
            // if (i === tags.size) {
            //   resolve({
            //     message: "OK",
            //     code: 200
            //   });
            // }
        });
    });
});
//# sourceMappingURL=index.js.map