/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var exports = module.exports = function (NinjaAPI) {
	var module = {};

	var request = require('request');
	var ninjaConnection = require('ninja-rmm-api')(NinjaAPI);

	module.getAlerts = function getAlerts(connection) {
		var ninjaReq = {
			method: 'GET',
			resource: '/v1/alerts'
		};

		return new Promise(function(resolve, reject) {
			request(ninjaConnection.generateOptions(ninjaReq), function(err, response, data) {
				if(err) return reject(err);
				resolve(data);
			})
		});
	}

	return module;
};