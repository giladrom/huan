var PNF = require('google-libphonenumber').PhoneNumberFormat;
var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

var lineReader = require('line-reader');

lineReader.eachLine(process.stdin, function (line, last) {
    var time = new Date().toLocaleDateString(
        'en-us'
    );

    if (line.includes("Line 1")) {
        line = line.replace("\"", '');

        var fields = line.split(',');

        var variation = fields[4].split('|');
        var line1 = variation[1].split(':')[1];

        if (line.includes("Line 2")) {
            var line2 = variation[2].split(':')[1];

            try {
                if (phoneUtil.isValidNumber(phoneUtil.parse(line1, 'US'))) {
                    var phoneNumber = phoneUtil.parse(line1, 'US');

                    line1 = phoneUtil.format(phoneNumber, PNF.NATIONAL).replace('\(', '').replace('\)', '').replace(' ', '-');
                }
            } catch (e) {

            }

            try {
                if (phoneUtil.isValidNumber(phoneUtil.parse(line2, 'US'))) {
                    var phoneNumber = phoneUtil.parse(line2, 'US');

                    line2 = phoneUtil.format(phoneNumber, PNF.NATIONAL).replace('\(', '').replace('\)', '').replace(' ', '-');
                }
            } catch (e) {

            }

            console.log(fields[0], ",", time, ",", fields[3].replace("\"", ""), ",", variation[0].replace("Color: ", "").replace("\"", ""), ",", line1.toUpperCase(), ",", line2.toUpperCase().replace("\"", ""));
        } else {
            console.log(fields[0], ",", time, ",", fields[3].replace("\"", ""), ",", variation[0].replace("Color: ", "").replace("\"", ""), ",", line1.toUpperCase().replace("\"", ""));
        }
    }
    // do whatever you want with line...
    if (last) {
        // or check if it's the last one
    }
});