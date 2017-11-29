/*
 * Dealing with Zoho
 *
 * See the API:
 * https://desk.zoho.com/DeskAPIDocument#Introduction
 */

var exports = module.exports = function (ZohoAPI, DEBUG) {
	var module = {};

	var request = require('request');
	var orgID = null;
	var departments = [];
	var department = {id: ZohoAPI.departmentID};
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
				if(DEBUG) console.log("Org ID: " + orgID);
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
					qs: {
						limit: 25,
						sortBy: 'accountName'
					},
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
					if(DEBUG) console.log("Accounts:", data);
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
	 * Get a department to use
	 *
	 * @returns {String}
	 */
	function getDepartment() {
		if(department) {
			return Promise.resolve(department);
		}
		var p = new Promise(function(resolve, reject) {
			getDepartments().then(function(resolve, reject) {
				resolve(departments[0] || null);
			})
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
			getOrganisation().then(getDepartment).then(function(dept) {
				var query = {
					searchStr: customer_name,
					module: 'accounts',
					departmentId: dept.id,
				};
				return search(query);
			}).then(function (data) {
				if(!data)
				{
					reject('Unable to find Zoho account for "' + customer_name + '" - no matches');
					return;
				}

				if(data['count'] == 0)
				{
					reject('Unable to find Zoho account for "' + customer_name + '" - no results');
				}
				if(DEBUG) console.log("Account search results: ", data);

				for(var i = 0; i < data.length; i++)
				{
					if(data[i].accountName === customer_name)
					{
						resolve(data[i]);
						return;
					}
				}
				reject('Unable to find Zoho account for "' + customer_name + '", search results did not match');
			}).catch(function(e) {
				reject('While finding Zoho account for "' + customer_name +'":' +e.message);
			});
		});
	}

	/**
	 * Use the Zoho search
	 * @param {Array} query
	 * @returns {array}
	 */
	function search(query)
	{
		return new Promise(function(resolve, reject) {
			getOrganisation().then(getDepartment).then(function(dept) {
				var options = {
					method: 'GET',
					url: ZohoAPI.host + '/search',
					qs: query,
					headers: {
						'Authorization': 'Zoho-authtoken ' + ZohoAPI.Authorization,
						'orgId': orgID
					}
				};

				if(DEBUG) console.log("Searching for ", query);

				var results = [];
				request(options, function(err, response, data) {
					if(err) {
						reject(err);
					}
					if(DEBUG) console.log(data);
					if(!data)
					{
						data = array();
					}
					else
					{
						var data = JSON.parse(data);
						if(data['message'])
						{
							reject(data['message']);
							return;
						}
						data = data.data ? data.data : data;
					}
					for(var i = 0; i < data.length; i++)
					{
						if(DEBUG) console.log(i, data[i]);
						results.push(data[i]);
					}
					resolve(results);
				});
			});
		});
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
			search({module: 'contacts', searchStr: account.accountName}).then(function(contacts) {
				if(contacts.length >= 1)
				{
					if(DEBUG) console.log("Selected contact 0: ",contacts[0]);
					resolve(contacts[0]);
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
		var ticket_fields = [
			'type',
			'status',
			'message',
			'timestamp',
			'device.role',
			'device.system_name',
			'device.display_name'
		];
		var ticket = {
			subject: alert.message,
			description: 'Ninja Notification<br />',
			departmentId: department.id,
			contactId: contact.id
		};


		for(var i = 0; i < ticket_fields.length; i++)
		{
			var field = ticket_fields[i];
			var object = alert;
			if(field.indexOf('.') > 0)
			{
				var split = field.split('.',2);
				object = object[split[0]];
				field = split[1];
			}
			add_field(object, field);
		}
		function add_field(object, field)
		{

			if(field == 'system_name' && object.id)
			{
				ticket.description += capitalizeFirstLetter(field).replace('_', ' ') + ': ' +
						'<a href="https://app.ninjarmm.com/#/deviceDashboard/' + object.id + '/overview" target="_blank">' + object.system_name + '</a><br />'
			}
			else
			{
				ticket.description += capitalizeFirstLetter(field).replace('_', ' ') + ': ' + object[field] + '<br />';
			}
		}

		return ticket;
	}

	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	function postTicket(ticket)
	{
		if(DEBUG) console.log("Posting ", ticket);
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
				if(DEBUG) console.log(data);
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
		return getDepartment()
			.then(getAccount.bind(null, alert.customer.name))
			.then(getContact)

			.then(function(contact) {
				var ticket = createTicket(alert, contact);
				if(DEBUG) console.log('Creating a ticket', alert, ticket);
				postTicket(ticket);
			})
			.catch(function(reason) {
				throw new Error(reason);
			});

	}

	return module;
};