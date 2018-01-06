module.exports = EC2;
var	AWS = require('aws-sdk'),
	fs = require('fs'),
	chalk = require('chalk'),
	cp = require('child_process'),
	path = require('path'),
	utils = require('./lib/utils');





function EC2 (opts) {
	var opts = opts || {profile: 'default'};
	var profile = opts.profile || 'default';
	this.profile = opts.profile || 'default';
	try {
		var config = require(process.env.HOME + '/.aws/' + this.profile + '.json');
		if (config.accessKeyId.length !== 20 ||
			config.secretAccessKey.length !== 40)
			throw err;
		this.sshKeys = config.sshKeys;
		AWS.config.loadFromPath(process.env.HOME + '/.aws/' + this.profile + '.json');
	} catch (err) {
		console.log(err.message)
		return console.log("Error: No aws credentials found for profile", `'${profile}'.` ,
					"\n\nRun 'ec2 configure'.");
	}

	this.getInstances = getInstances.bind(this);
	this.getInstance = getInstance.bind(this);
	this.ls = ls.bind(this);
	this.ssh = ssh.bind(this);
	this.sftp = sftp.bind(this);
	this.exec = exec.bind(this);
	this.mount = mount.bind(this);
	this.umount = umount.bind(this);
	this.start = start.bind(this);
	this.stop = stop.bind(this);
	this.terminate = terminate.bind(this);
}

EC2.States = {
	stopped: 'red',
	terminated: 'red',
	running: 'green',
	stopping: 'blue',
	starting: 'green'
}	



function getInstances(options){ 
	var options = options || {};
	var filters = options.filters || {};
	var sort = options.sort || 'state';
	var asc = typeof options.ascending !== 'undefined' ? options.ascending : 1;
	var limit = options.limit || null;
	return new Promise (function(resolve, reject) {
		var api = new AWS.EC2();
		api.describeInstances(
			function (err, results) {
				if (err) reject(err);
				var data = [];

				// parse all instances from all reservations
				for (var i = 0 ; i < results.Reservations.length; i++) {

					var reservation = results.Reservations[i];

					for (var j = 0; j < reservation.Instances.length; j++) {
						var instance = reservation.Instances[j];

						// simplified data item
						var item = {
							image: instance.ImageId,
							id: instance.InstanceId,
							type: instance.InstanceType,
							key: instance.KeyName,
							launched: instance.LaunchTime,
							ip: instance.PublicIpAddress || null,
							state: instance.State.Name,
							name: null
						};

						// check for a 'Name' tag
						for (var k = 0 ; k < instance.Tags.length; k++) {
							if (instance.Tags[k].Key === 'Name')
								item.name = instance.Tags[k].Value;
						}

						// filter item out if it doesnt match all filters
						var keys = Object.keys(filters).filter(key => {
							return (filters[key] !== null &&
								   filters[key] !== undefined &&
								   key in item);
						});
						if(keys.filter(key => item[key] === filters[key])
							.length !== keys.length) continue;

						if (options.limit && data.length === options.limit)
							break;

						// add to returned data elements
						data.push(item);
					}
				}

				// sort instances by the specified key, flipping
				// the orientation according to the 'asc' parameter
				data.sort((a,b) => a[sort] < b[sort] ? -1*(asc-1) : 
								   a[sort] > b[sort] ?  1*(asc-1) : 0);
				resolve(data);
			}
		)
	})
}


function getInstance (filters) {
	return new Promise((resolve, reject) => {
		this.getInstances({filters: filters, limit: 1})
		.then(function(instances) {
			if (instances.length === 0) {
				resolve(null);
			}
			resolve(instances[0]);
		});
	});
}


function ls(options) {
	var options = options || {};
	this.getInstances(options)
	.then(function (instances) {
		var keys = options.keys || ['id', 'name', 'state', 'ip'];
		var opts = {
			spacing: options.spacing || 2,
			chalk: options.chalk || {state: EC2.States}
		}
		utils.printTable(instances, keys, opts);
	})
}



function ssh(params) {
	return new Promise ((resolve, reject) => {
		if (typeof params === 'undefined') {
			reject( console.log("Missing required inputs."));			
		}
		this.getInstance(params).then((instance) => {
			var child = cp.spawn('ssh',
				['-i', 
				this.sshKeys + '/' + 
				instance.key + '.pem',
				'ubuntu@' + instance.ip, params.command || ''],
				{stdio: 'inherit'});
			child.stdout.on('data', (dat) => {console.log(dat.toString('utf-8'))})
		}).catch(()=>{});
	})
}

function sftp (params) {
	return new Promise ((resolve, reject) => {
		if (typeof params === 'undefined') {
			reject( console.log("Missing required inputs."));
		}

		this.getInstance(params).then( (instance) => {
			var child = cp.spawn('sftp', 
				[
					'-i',
					this.sshKeys + '/' + instance.key + '.pem',
					'ubuntu@' + instance.ip
				],
				 {stdio: 'inherit'}
				);
			resolve(child);
		}).catch(()=>{});
	})
}


function exec (params) {
	var cmd = params.command || "";
	return new Promise ((resolve, reject) => {
		if (typeof params === 'undefined' || cmd.length === 0) {
			console.log("usage: ec2 exec -n <name> -c <command>");
		}
		else {
			this.getInstance(params).then( (instance) => {
				var child = cp.spawn('ssh', 
					[
						'-i',
						this.sshKeys + '/' + instance.key + '.pem',
						'ubuntu@' + instance.ip,
						cmd
					],
					 {stdio: 'inherit'}
					);
				resolve(child);
			}).catch(()=>{});
		}			
	})
}



function mount (params) {
	this.getInstance(params).then(function (instance) {
		if (typeof instance === 'undefined') {
			console.log(chalk.bold.red('error: instance not found'));
			return;
		}
		var lines = fs.readFileSync('/etc/mtab', 'utf-8').split('\n');
		for (var i = 0 ; i < lines.length; i++) {
			if (lines[i].match(instance.ip)) {
				mountPoint = lines[i].split(' ')[1]
				console.log(chalk.red('Instance is already mounted at ' + mountPoint));
				return;
			}
		}


		var mountPoint = path.resolve(instance.name)
		if (!fs.existsSync(mountPoint))
			fs.mkdirSync(mountPoint);

		cp.exec(`sudo sshfs -o allow_other,IdentityFile=${process.env.HOME}/.aws/keys/${instance.key}.pem ${mountPoint} ubuntu@${instance.ip}:/home/ubuntu`, 
				function (err, resut) {
					if (!err) {
						console.log(chalk.bold.yellow('Mounted ' + instance.ip + ' to ' + mountPoint));						
					} else {
						console.log(err)
						return;
					}
				})
	}).catch(()=>{});
}

function umount (params) {
	this.getInstance(params).then(function (instance) {


		var lines = fs.readFileSync('/etc/mtab', 'utf-8').split('\n');
		for (var i = 0 ; i < lines.length; i++) {
			if (lines[i].match(instance.ip)) {
				mountPoint = lines[i].split(' ')[1]
				cp.exec(`fusermount -u ${mountPoint}`,
					function (err, result) {
						if (err) {console.log(chalk.bold.red("error:"), err.msg)}
						else {
							console.log(chalk.bold.green('Unmounted ' + instance.ip + ' from ' + mountPoint))
						}
					})
			}
		}
		if (typeof mountPoint === 'undefined') {
			console.log(chalk.bold.red('error: instance not mounted'))
		}
	}).catch(()=>{});
}


function start (params) {
	var ec2 = new AWS.EC2();
	var cb = function (err, result) {
		if (err) {
			console.log(chalk.yellow("Error: ", err.message))
		}
	}


	this.getInstance(params).then((instance) => {
			ec2.startInstances({InstanceIds: [instance.InstanceId]}, cb);
		}).catch(()=>{});
};

function stop (params) {
	var ec2 = new AWS.EC2();
	var cb = function (err, result) {
		if (err) {
			console.log(chalk.yellow("Error: ", err.message))
			return process.exit(0);				
		} else if (result.StoppingInstances[0].InstanceId === params.id) {
				console.log(chalk.yellow("Stopping " + params.id));
		}
	}


	this.getInstance(params).then((instance) => {
			ec2.stopInstances({InstanceIds: [instance.InstanceId]}, cb);
		}).catch(()=>{});
};

function terminate (params) {
	var ec2 = new AWS.EC2();
	var cb = function (err, result) {
		if (err) {
			console.log(chalk.yellow("Error: ", err.message))
			return process.exit(0);				
		} else if (result.TerminatingInstances[0].InstanceId === params.id) {
				console.log(chalk.yellow("Stopping " + params.id));
		}
	}


	this.getInstance(params).then((instance) => {
			ec2.terminateInstances({InstanceIds: [instance.InstanceId]}, cb);
		}).catch(()=>{});
};



module.exports = EC2;