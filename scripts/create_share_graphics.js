const admin = require('firebase-admin');
const { Storage } = require("@google-cloud/storage");
const Jimp = require("jimp");
const uuidv1 = require("uuid/v1");

var serviceAccount = require('./huan-33de0-5245a569c6ed.json');
admin.initializeApp();

async function main() {
  new Jimp(1080, 1920, async (err, canvas) => {
    const backdrop = await Jimp.read(
      "https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/App_Assets%2FTemplates%2FShare%20Story%20Template.png?alt=media&token=b92dde22-d304-49aa-9dc3-0d2291271d7f"
    );
    const image = await Jimp.read(
      "https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/Photos%2F41c34bd0-9184-11ea-a4bb-47a55292535d.jpeg?alt=media&token=41c43630-9184-11ea-a4bb-47a55292535d"
    );

    const shield = await Jimp.read("https://firebasestorage.googleapis.com/v0/b/huan-33de0.appspot.com/o/App_Assets%2FTemplates%2FShield%20Paw.png?alt=media&token=35e99940-a2f6-4f99-8173-dbc0370499d7");

    await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK).then((font) => {
      var w = backdrop.bitmap.width;
      var h = backdrop.bitmap.height;
      let text = "Tiny Puppy Pie is now protected by Huan!";
      var textWidth = Jimp.measureText(font, text) - 200;
      var textHight = Jimp.measureTextHeight(font, text);

      backdrop.print(
        font,
        w / 2 - textWidth / 2,
        1275,
        {
          text: text,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        textWidth,
        textHight
      );
    });

    await image.cover(780, 750);
    await shield.resize(280, 250);

    const x = 0,
      y = 0;

    backdrop.blit(image, 150, 250);

    canvas
      .blit(backdrop, 0, 0)
      .blit(shield, backdrop.bitmap.width / 2 - shield.bitmap.width / 2, 900);

    canvas.write("share_image.png");

    canvas
      .getBase64Async(Jimp.MIME_PNG)
      .then((buffer) => {
        const bucketName = "huan-33de0.appspot.com";
        const filename = "0000000011111AAAAA" + uuidv1() + ".png";

        console.log(`Writing image to DB as ${filename}...`);

        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const file = bucket.file("Photos/" + filename);

        const uuid = uuidv1();

        file
          .save(Buffer.from(buffer.split(';base64,').pop(), "base64"))
          .then(async (r) => {
            file
              .setMetadata({
                contentType: "image/png",
                metadata: {
                  firebaseStorageDownloadTokens: uuid,
                },
              })
              .then(() => {
                file
                  .makePublic()
                  .then((p) => {
                    console.log("Successfully made Public", JSON.stringify(p));

                    file.getMetadata().then((metadata) => {
                      console.log("Metadata", JSON.stringify(metadata));

                      console.log(
                        "Image uploaded successfully",
                        JSON.stringify(r)
                      );

                      // HACK TO BYPASS GOOGLE'S MISSING API FOR getDownloadURL()
                      // https://github.com/googleapis/nodejs-storage/issues/697

                      console.log(
                        `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/Photos%2F${filename}?alt=media&token=${uuid}`
                      );
                    });
                  })
                  .catch((e) => {
                    console.error("makePublic()", e);
                  });
              })
              .catch((e) => {
                console.error("setMetadata()", e);
              });
          })
          .catch((e) => {
            console.error(e);
          });
      })
      .catch((e) => {
        console.error(e);
      });
  });
}

main();
