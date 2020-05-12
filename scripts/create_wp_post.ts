var WPAPI = require("wpapi");
var moment = require("moment");
var NodeGeocoder = require("node-geocoder");
var geocoder = NodeGeocoder({
  provider: "google",
  httpAdapter: "https",
  apiKey: "AIzaSyAw858yJn7ZOfZc5O-xupFRXpVZuyTL2Mk",
  formatter: null
});

var Twit = require("twit");
var T = new Twit({
  consumer_key: "ivIbMZjILEIAiyNHOs8ZFH6S9",
  consumer_secret: "MtpixDyPZ8NHIbqt8E4XpxuXlTxqdDZYu6fmQx35sRa9VnBMf4",
  access_token: "1024933013992300545-Z7GJ6HCvuZaMVAbKHUVNFbKWjTLdQS",
  access_token_secret: "8r1mi1voiFfSKinijSRwYo7XYoOuGxbdisdwmdKOVdiZk",
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  strictSSL: true // optional - requires SSL certificates to be valid.
});

function updateWPPost(tag): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const wp = new WPAPI({
      endpoint: "https://gethuan.com/wp-json",
      username: "dogbot",
      password: "fOmz Gv4B LU0p eci9 Kem5 YG0O"
    });

    wp.posts()
      .perPage(50)
      .then(posts => {
        posts.forEach(post => {
          if (post.link === tag.alert_post_url) {
            console.log("Found post for link", post.id);

            wp.posts()
              .id(post.id)
              .update({
                title: `Update: ${tag.name} has been found!`,
                featured_media: 14508
              })
              .then(r => {
                console.log("Post updated successfully");
                resolve(post.id);
              })
              .catch(e => {
                reject(e);
              });
          }
        });
      })
      .catch(e => {
        console.error(JSON.stringify(e));
        reject(e);
      });
  });
}

function generateWPPost(tag): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const wp = new WPAPI({
      endpoint: "https://gethuan.com/wp-json",
      username: "dogbot",
      password: "fOmz Gv4B LU0p eci9 Kem5 YG0O"
    });

    var lastseen = moment(tag.markedlost).format("MMMM Do YYYY, h:mm:ss a");
    const location = tag.location.split(",");

    geocoder.reverse({ lat: location[0], lon: location[1] }).then(res => {
      var address;

      try {
        if (res[0].streetName !== undefined && res[0].city !== undefined) {
          address = "Near " + res[0].streetName + " in " + res[0].city;
        } else {
          address = "Unknown address";
        }
      } catch (error) {
        address = "Unknown address";
      }

      const himher = tag.gender === "Male" ? "him" : "her";

      const lat = Number(location[0]).toFixed(2);
      const lng = Number(location[1]).toFixed(2);

      wp.posts()
        .create({
          slug:
            randomIntFromInterval(111, 999) +
            "/" +
            "missing-pet-alert-" +
            tag.name.replace(" ", "-"),
          title: `Missing Pet Alert: ${tag.name} (${res[0].city}, ${res[0].administrativeLevels.level1short})`,
          content:
            `<h2 style=\"text-align: center;\">${tag.name} has been missing since ${lastseen}. Last seen ${address}.</h2>\n\n` +
            `<p><img class=\"aligncenter\" src="${tag.img}" alt="Image of ${tag.name}" width="510" height="512" /></p>\n` +
            `<ul>\n<li>${tag.size} ${tag.gender} ${tag.breed}</li>\n<li>Fur Color: ${tag.color}</li>\n<li>Character: ${tag.character}</li>\n<li>Remarks: ${tag.remarks}</li>\n</ul>\n` +
            `<p>Please help us find ${tag.name} by installing the Huan App and joining our network. ${tag.name} is wearing a Huan Bluetooth tag - You could be the one who picks up the signal!</p>\n` +
            `[iframe width="100%" height="500" src="https://ppn.gethuan.com/home;embed=true;lat=${lat};lng=${lng}"]\n` +
            `<p><strong>Share this post on social media and help ${tag.name} return home!</strong></p>\n`,
          excerpt: `${tag.name} has been missing since ${lastseen}. Last seen ${address}.`,
          author: 54,
          format: "standard",
          categories: [136],
          status: "draft",
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

function tweet(tag): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    T.post("statuses/update", { status: "hello world!" })
      .then(data => {
        resolve(data);
      })
      .catch(e => {
        reject(e);
      });
  });
}

function randomIntFromInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// tweet({
//   name: "Voyager",
//   img:
//     "https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/Photos%2F2019-12-02T22%3A46%3A22-08%3A00-b0463ec4-d465-3595-4128-c1f21335b37b.jpeg?alt=media&token=96d8b8e8-0355-4630-8eed-4470a472b6a2",
//   breed: ["German Shepherd", "Boxer", "Husky"],
//   character: "Friendly",
//   color: ["Black", "White"],
//   gender: "Male",
//   location: "34.18151271726948,-118.76921698859782",
//   markedlost: "2019-12-30 09:30:26",
//   lastseen: "2019-12-29 09:30:26",
//   size: "Large",
//   remarks: "Don't Chase!"
// })
//   .then(r => {
//     console.log(r);
//   })
//   .catch(e => {
//     console.error(e);
//   });

// generateWPPost({
//   name: "Voyager",
//   img:
//     "https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/Photos%2F2019-12-02T22%3A46%3A22-08%3A00-b0463ec4-d465-3595-4128-c1f21335b37b.jpeg?alt=media&token=96d8b8e8-0355-4630-8eed-4470a472b6a2",
//   breed: ["German Shepherd", "Boxer", "Husky"],
//   character: "Friendly",
//   color: ["Black", "White"],
//   gender: "Male",
//   location: "34.18151271726948,-118.76921698859782",
//   markedlost: "2019-12-30 09:30:26",
//   lastseen: "2019-12-29 09:30:26",
//   size: "Large",
//   remarks: "Don't Chase!"
// })
//   .then(r => {
//     console.log(r);
//   })
//   .catch(e => {
//     console.error(e);
//   });

updateWPPost({
  name: "Voyager",
  alert_post_url: "https://gethuan.com/114-missing-pet-alert-voyager/",
  img:
    "https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/Photos%2F2019-12-02T22%3A46%3A22-08%3A00-b0463ec4-d465-3595-4128-c1f21335b37b.jpeg?alt=media&token=96d8b8e8-0355-4630-8eed-4470a472b6a2",
  breed: ["German Shepherd", "Boxer", "Husky"],
  character: "Friendly",
  color: ["Black", "White"],
  gender: "Male",
  location: "34.18151271726948,-118.76921698859782",
  markedlost: "2019-12-30 09:30:26",
  lastseen: "2019-12-29 09:30:26",
  size: "Large",
  remarks: "Don't Chase!"
})
  .then(r => {
    console.log(r);
  })
  .catch(e => {
    console.error(e);
  });
