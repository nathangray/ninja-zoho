/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var exports = module.exports = function (ZohoAPI) {
	var module = {};

	var request = require('request');
	var orgID = null;
	var departments = [];
	var department = null;
	var account = ZohoAPI.accountID;
	var contacts = [];
	var contact = null;
	var customer_contact_map = {};

	function getOrganisation() {
		if(ZohoAPI.orgID) {
			orgID = ZohoAPI.orgID;
		}
		if(orgID) return Promise.resolve(orgID);
		var options = {
			method: 'GET',
			url: ZohoAPI.host + '/organizations',
			headers: {
				'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization
			}
		};

		var p = new Promise(function(resolve, reject)  {
			request(options, function(err, response, data) {
				if(err) {
					reject(err);
				}
				var data = JSON.parse(data);
				orgID = data.data[0].id;
				console.log("Org ID: " + orgID);
				resolve(orgID);
			});
		});

		return p;
	}

	/**
	 * Get all the accounts from Zoho
	 */
	function getAccounts() {

		if(Object.keys(customer_contact_map).length !== 0) {
			return Promise.resolve(customer_contact_map);
		}
		var p = new Promise(function(resolve, reject) {
			getOrganisation().then(function(orgID) {
				var options = {
					method: 'GET',
					url: ZohoAPI.host + '/accounts',
					headers: {
						'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization,
						'orgId': orgID
					}
				};
				request(options, function(err, response, data) {
					if(err) {
						reject(err);
					}
					var data = JSON.parse(data);
					if(!data.data || !data.data.length)
					{
						throw new Error('Could not get account list');
					}
					for(var i = 0; i < data.data.length; i++)
					{
						var account = data.data[i];
						customer_contact_map[account.accountName] = account;
					}
					resolve(customer_contact_map);
				});
			});
		});
		return p;
	}

	/**
	 * Get all the departments from Zoho
	 */
	function getDepartments() {

		if(departments.length !== 0) {
			return Promise.resolve(departments);
		}
		var p = new Promise(function(resolve, reject) {
			getOrganisation().then(function(orgID) {
				var options = {
					method: 'GET',
					url: ZohoAPI.host + '/departments',
					headers: {
						'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization,
						'orgId': orgID
					}
				};
				request(options, function(err, response, data) {
					if(err) {
						reject(err);
					}
					var data = JSON.parse(data);
					if(!data.data || !data.data.length)
					{
						throw new Error('Could not get department list');
					}
					for(var i = 0; i < data.data.length; i++)
					{
						departments[i] = data.data[i];
					}
					if(ZohoAPI.departmentID)
					{
						for(var i = 0; i < departments.length; i++)
						{
							if(departments[i].id === ZohoAPI.departmentId)
							{
								department = departments[i];
							}
						}
					}
					if(!department)
					{
						department = departments[0];
					}
				//	console.log('Selected department: ' , department);
					resolve(departments);
				});
			});
		});
		return p;
	}
	/**
	 * Get all the contacts from Zoho
	 */
	function getContacts() {

		if(contacts.length !== 0) {
			return Promise.resolve(contacts);
		}
		var p = new Promise(function(resolve, reject) {
			getOrganisation().then(function(orgID) {
				var options = {
					method: 'GET',
					url: ZohoAPI.host + '/contacts',
					headers: {
						'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization,
						'orgId': orgID
					}
				};
				request(options, function(err, response, data) {
					if(err) {
						reject(err);
					}
					var data = JSON.parse(data);
					if(!data.data || !data.data.length)
					{
						throw new Error('Could not get contact list');
					}
					for(var i = 0; i < data.data.length; i++)
					{
						var contact = data.data[i];
						if(typeof contacts[contact.accountId] === 'undefined')
						{
							contacts[contact.accountId] = [];
						}
						contacts[contact.accountId].push(contact);
					}
					resolve(contacts);
				});
			});
		});
		return p;
	}

	/**
	 * Find the Zoho account that best matches the given customer name
	 *
	 * @param {String} customer_name
	 * @returns {Promise}
	 */
	function getAccount(customer_name) {
		return new Promise(function(resolve, reject) {
			getAccounts().then(function(map) {
				if(map[customer_name])
				{
				//	console.log("Selected account: ", map[customer_name]);
					resolve(map[customer_name]);
				}
				else
				{
					reject("Unable to find Zoho account for '" + customer_name + "'");
				}
			});
		})
	}

	/**
	 * Find a contact for the given account
	 *
	 * @param {type} alert
	 * @param {type} contact
	 * @returns {nm$_zoho.exports.createTicket.zohoAnonym$3}
	 */
	function getContact(account)
	{
		return new Promise(function(resolve, reject) {
			getContacts().then(function(contacts) {
				if(contacts[account.id])
				{
				//	console.log("Selected contact: ",contacts[account.id]);
					resolve(contacts[account.id][0]);
				}
				else
				{
					reject("Unable to find a Zoho contact for " + account.accountName);
				}
			})
		});
	}

	/**
	 * Create the ticket for Zoho
	 *
	 * @param {Object} alert Alert from Ninja
	 * @param {Object} contact Client contact from Zoho
	 */
	function createTicket(alert, contact)
	{
		return {
			subject: alert.message,
			description: JSON.stringify(alert),
			departmentId: department.id,
			contactId: contact.id

		};
	}

	function postTicket(ticket)
	{
		console.log("Posting ", ticket);
		var options = {
			method: 'POST',
			url: ZohoAPI.host + '/tickets',
			headers: {
				'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization,
				'orgId': orgID
			},
			json: ticket
		};
		var p = new Promise(function(resolve, reject)  {
			request(options, function(err, response, data) {
				console.log(data);
				if(err) {
					reject(err);
				}
				resolve(data);
			});
		});

		return p;
	}

	/**
	 * Add a new ticket to zoho based on the given Ninja alert
	 */
	module.addTicket = function addTicket(alert) {
		console.log('addTicket()');
		getDepartments()
			.then(getAccount.bind(null, alert.customer.name))
			.then(getContact)

			.then(function(contact) {
				var ticket = createTicket(alert, contact);
				console.log(ticket);
			//	postTicket(ticket);
			})
			.catch(function(reason) {
				throw new Error(reason);
			});

	}

	return module;
};