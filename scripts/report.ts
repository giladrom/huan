var net = require("net");
var os = require("os");
var moment = require("moment");
var pt = require("promise-timeout");

const admin = require("firebase-admin");

var serviceAccount = require("./huan-33de0-5245a569c6ed.json");

var twilio = require("twilio");
var sgMail = require("@sendgrid/mail");

const accountSid = "ACc953b486792eb66808eec0c06066d99c"; // Your Account SID from www.twilio.com/console
const authToken = "27afe27991de2ca1567cf0cfcc697cd0"; // Your Auth Token from www.twilio.com/console
const sms_orig = "+13108818847";
const sms_dest = "+18189628603";
const client = new twilio(accountSid, authToken);

sgMail.setApiKey(
  "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"
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

var db = admin.firestore();

const settings = { timestampsInSnapshots: true };
db.settings(settings);

var tags = [];
var users = [];
var promises = [];

var tags_attached = 0;
var tags_monitored = 0;
var registered_users = 0;
var anonymous_users = 0;
var active_users = 0;
var inactive_tags = 0;

db.collection("Tags")
  .get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      var tag = doc.data();

      if (typeof tag.uid === "string") {
        console.warn("Oudated tag, skipping", typeof tag.uid);
      }

      tags.push(tag);
      if (
        (tag.tagattached == true || tag.lastseenBy != "") &&
        typeof tag.uid === "object" &&
        tag.lost == false
      ) {
        // console.log(`Tag ${tag.tagId} is attached`);
        tags_attached++;

        var ls, diff, user;

        if (typeof tag.lastseen === "string") {
          ls = moment(moment.unix(tag.lastseen / 1000));
        } else {
          ls = moment(moment.unix(tag.lastseen.toDate() / 1000));
        }

        var title = null;
        var body = null;
        diff = moment(moment.now()).diff(ls, "days");
        switch (diff) {
          case 1:
            title = `No Signal received from ${tag.name} in over 24 Hours`;
            body = "Please open your Huan app for more info.";
            break;
          case 5:
            title = `No Signal received from ${tag.name} for over 5 Days`;
            body = "Please open your Huan app for more info.";
            break;
          case 10:
            title = `No Signal received from ${tag.name} for over 10 Days`;
            body = "Please open your Huan app for more info.";
            break;
          case 30:
            title = `No Signal received from ${tag.name} for over 30 Days`;
            body = "Please open your Huan app for more info.";
            break;
          default:
            break;
        }

        if (title != null) {
          inactive_tags++;

          if (typeof tag.uid === "object" && tag.uid !== null) {
            db.collection("Users")
              .doc(tag.uid[0])
              .get()
              .then((snapshot) => {
                if (snapshot.exists) {
                  user = snapshot.data();

                  // console.log(user);

                  console.log(
                    `Tag ${
                      tag.tagId
                    } was last seen ${ls.fromNow()} (diff: ${diff}) ` +
                      (diff > 2
                        ? `[Tag is inactive: ${tag.name}/${user.account.displayName}/${tag.breed}/${tag.size}]`
                        : "")
                  );

                  if (
                    user.settings.textAlerts === true &&
                    tag.uid[0] == "8XQXnyJP6pZa9UiGy30buKGRZgT2"
                  ) {
                    client.messages
                      .create({
                        body: `[HUAN ALERT] ${title}. ${body}`,
                        from: sms_orig,
                        to: sms_dest,
                      })
                      .then((msg) =>
                        console.log("Sent SMS to " + sms_dest, msg.sid)
                      )
                      .catch((e) => {
                        console.error("Unable to send SMS", e);
                      });
                  } else {
                    console.warn("Alerts not enabled");
                  }

                  if (
                    user.settings.emailAlerts === true &&
                    tag.uid[0] == "8XQXnyJP6pZa9UiGy30buKGRZgT2"
                  ) {
                    const scheduled = Math.floor(Date.now() / 1000);

                    console.log("Scheduling delivery at", scheduled);

                    const msg = {
                      to: user.account.email,
                      from: "info@gethuan.com",
                      dynamic_template_data: {
                        subject: `[HUAN ALERT] ${title}`,
                        name: user.account.displayName,
                        title: title,
                        body: body,
                      },
                      sendAt: scheduled,
                      templateId: "d-89592c72257c4a41a1f40147ca0926bc",
                    };

                    sgMail
                      .send(msg)
                      .then(() => {
                        console.log("Sent alert email to ", user.account.email);
                      })
                      .catch((e) => {
                        console.error(
                          "Unable to send alert email to",
                          user.account.email,
                          e.toString()
                        );
                      });
                  } else {
                    console.warn("Email alerts not enabled");
                  }
                }
              })
              .catch((err) => {
                console.error(
                  "Error getting documents",
                  err,
                  JSON.stringify(tag)
                );
              });
          }
        }
      } else {
        if (typeof tag.fcm_token === "object") {
          console.log(
            `[Tag ${tag.tagId} is not attached: ${tag.name}/${tag.breed}/${tag.size}]`
          );
        } else {
          console.warn("Inactive FCM token, skipping");
        }
      }

      if (tag.lastseenBy != "") {
        tags_monitored++;
      }
    });

    tags.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      } else {
        return 0;
      }
    });

    console.log("Registered Pets: " + tags.length);
    console.log("Active tags: " + (tags_monitored - inactive_tags));
    console.log("Inactive tags: " + inactive_tags);
  })
  .catch((err) => {
    console.error("2 Error getting documents", err);
  });

db.collection("Users")
  .get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      var user = doc.data();
      users.push(user);
      if (user.signin !== "Anonymous") {
        registered_users++;
      } else {
        anonymous_users++;
      }
    });

    console.log("Registered users: " + registered_users);
    console.log("Anonymous users: " + anonymous_users);
  })
  .catch((err) => {
    console.log("3 Error getting documents", err);
  });

var sending = 0;
var sent = 0;
var nerror = 0;

function sendNotification(destination, tag, title, body, func = "") {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve, reject) => {
    if (destination.fcm_token === null) {
      reject("Invalid FCM token");
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        tagId: tag.tagId,
        title: title,
        body: body,
        function: func,
      },
      token: destination.fcm_token[0].token,
    };

    // console.log("Sending Notifications: " + JSON.stringify(message));
    sending++;

    // XXX
    resolve(true);
    // XXX
    //

    var p = admin.messaging().send(message, false);

    pt.timeout(p, 10000)
      .then((response) => {
        sent++;

        console.log(`Notifications: ${sending}/${sent}/${nerror}`);

        resolve(response);
      })
      .catch((error) => {
        nerror++;
        if (error instanceof pt.TimeoutError) {
          console.error("Timeout :-(");
        }
        reject(error);
      });
  });
}

setTimeout(() => {
  process.exit();
}, 20000);
