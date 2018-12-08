var net = require('net');
var os = require('os');
var moment = require('moment');
var Airtable = require('airtable');

var base = new Airtable({ apiKey: 'keyH3TDLkjR4sV3X7' }).base(
  'appqddZSvgOtmD166'
);

var endpoints = [];

base('Sensors')
  .select({
    fields: ['Hostname', 'Location', 'Country', 'Location Name']
  })
  .eachPage(
    function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      records.forEach(function(record) {
        if (
          record.get('Country') === 'Israel' &&
          record.get('Hostname') !== undefined
        ) {
          endpoints.push(record.get('Location Name'));

          console.log(
            'object Endpoint "' +
              record.get('Location Name') +
              '" {\n host = "' +
              record.get('Hostname') +
              '"\n}'
          );

          console.log(
            '\
            \nobject Host "' +
              record.get('Location Name') +
              '" {\nimport "generic-host"\naddress = "' +
              record.get('Hostname') +
              '"\nvars.client_endpoint = name\nvars.geolocation = "' +
              record.get('Location') +
              '"\nvars.map_icon = "wifi"\n}\n\
            '
          );
        }
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();
    },
    function done(err) {
      if (err) {
        console.error(err);
        return;
      }

      console.log(
        'object Zone "tel-aviv" {\nendpoints = ' +
          JSON.stringify(endpoints) +
          '\nparent = "master"\n}'
      );
    }
  );
