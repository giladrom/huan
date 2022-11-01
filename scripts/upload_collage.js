const fs = require('fs');

const { google } = require('googleapis');
const credentials = require('/Users/giladrom/Downloads/test-project-298722-b7665618b5a6.json');
const scopes = [
    'https://www.googleapis.com/auth/drive'
];
const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);
const drive = google.drive({ version: "v3", auth });

drive.files.list({}, (err, res) => {
    if (err) throw err;
    const files = res.data.files;
    if (files.length) {
        files.map((file) => {
            console.log(file);
        });
    } else {
        console.log('No files found');
    }
});

// var fileMetadata = {
//     'name': 'photo1.png'
// };
// var media = {
//     mimeType: 'image/png',
//     body: fs.createReadStream('tmp/Huan_Pack_Dec-12-2020-11-42.png')
// };
// drive.files.create({
//     resource: fileMetadata,
//     media: media,
//     fields: 'id'
// }, function (err, file) {
//     if (err) {
//         // Handle error
//         console.error(err);
//     } else {
//         console.log('File Id: ', file.id);
//     }
// });