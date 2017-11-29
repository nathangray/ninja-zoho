/**
* Take Ninja RMM alerts and create tickets in Zoho
*/
"use strict";

var DEBUG = 1;

var path = require('path');
var fs = require('fs');
var credentials = require( path.resolve( __dirname, "./credentials.js" ) );
var ninja = require(path.resolve( __dirname, './ninja'))(credentials.NinjaAPI, DEBUG);
var zoho = require(path.resolve( __dirname, './zoho'))(credentials.ZohoAPI);

//zoho.addTicket({message: 'Testing', customer:{name:'Oasis Dental'}});
var last_alert_id = 0;

try {
	last_alert_id = parseInt(
			fs.readFileSync('last_alert.json', 'utf8')
	);
}
catch (e) {}

/**
 * Process the alerts.
 *
 * This is done recursively to handle one at a time, rather than fire all the
 * async requests at once from a loop
 *
 * @param {Array} alerts
 * @param {int} i
 *
 */
function process(alerts, i) {
	if(DEBUG) console.log("Alerts: ", alerts);
	if(!alerts || !alerts.length)
	{
		return;
	}
	if(!i) i = 0;

	var last_id = last_alert_id;

	// Create ticket
	try {
		zoho.addTicket(alerts[i]).then(function() {
			last_id = Math.max(last_id, alerts[i].id);

			if(last_id > last_alert_id)
			{
				fs.writeFileSync('last_alert.json', last_id, 'utf8');
			}
			if(i+1 < alerts.length)
			{
				return process(alerts, i+1);
			}
		});
	}
	catch (e)
	{
		console.error("While processing an alert for " + alerts[i].customer.name +':');
		console.error(e.message)
		console.error("Alert:", alerts[i])
	}
}

if(DEBUG) console.log("Hi, I'm working.  \n Fetching alerts...");

// Get alerts
ninja.getAlerts(last_alert_id).then(function(alerts) {
	process(alerts, 0);
}, function() {
	console.error("Unable to get alerts");
});



