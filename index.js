/**
* Take Ninja RMM alerts and create tickets in Zoho
*/
"use strict";

var path = require('path');
var credentials = require( path.resolve( __dirname, "./credentials.js" ) );
var ninja = require(path.resolve( __dirname, './ninja'))(credentials.NinjaAPI);
var zoho = require(path.resolve( __dirname, './zoho'))(credentials.ZohoAPI);


// Get alerts

ninja.getAlerts().then(function(alerts) {
	if(!alerts || !alerts.length)
	{
		return;
	}

	// Create ticket
	for(var i = 0; i < alerts.length; i++)
	{
		try {
			zoho.addTicket(alerts[i]);
		}
		catch (e)
		{
			console.log("While processing an alert for " + alerts.customer.name +':');
			console.log(e.message)
			console.log("Alert:", alerts[i])
		}
	}
});
