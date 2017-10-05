/**
 * Dealing with Ninja
 *
 * See their API:
 * https://ninjaresources.s3.amazonaws.com/PublicApi/0.1.2/NinjaRMM%20Public%20API%20v0.1.2.pdf
 */

var exports = module.exports = function (NinjaAPI) {
	var module = {};

	var request = require('request');
	var ninjaConnection = require('ninja-rmm-api')(NinjaAPI);

	module.getAlerts = function getAlerts(since) {
		var ninjaReq = {
			method: 'GET',
			resource: '/v1/alerts'
		};
		if(typeof since !== 'undefined' && since)
		{
			ninjaReq.resource += '/since/' + since;
		}

		return new Promise(function(resolve, reject) {
			request(ninjaConnection.generateOptions(ninjaReq), function(err, response, data) {
				if(err) return reject(err);
				resolve(JSON.parse(data));
			})
		});
	}

	return module;
};