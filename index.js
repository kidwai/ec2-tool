module.exports = EC2;
var	AWS = require('aws-sdk'),
	fs = require('fs'),
	chalk = require('chalk'),
	cp = require('child_process'),
	path = require('path');
	

function EC2 (opts) {
	var opts = opts || {profile: 'default'};
	var profile = opts.profile || 'default';
	this.profile = opts.profile || 'default';
	try {
		var config = require(process.env.HOME + '/.aws/' + this.profile + '.json');
		if (config.accessKeyId.length !== 20 ||
			config.secretAccessKey.length !== 40)
			throw err;
		this.privateKeys = config.privateKeys;
		AWS.config.loadFromPath(process.env.HOME + '/.aws/' + this.profile + '.json');
	} catch (err) {
		console.log(err.message)
		return console.log("Error: No aws credentials found for profile", `'${profile}'.` ,
					"\n\nRun 'ec2 configure'.");
	}


	this.ls = function (params) {
		this.getInstances().then((instances) => {
		instances.sort((a,b) => {
			a.name = a.Tags['0']['Value'].toUpperCase();
			b.name = b.Tags['0']['Value'].toUpperCase();
			return a.name < b.name ? -1 : 
				   a.name > b.name ? 1 :
				   0;
		});

		var keys = [
			'instance-id',
			'state',
			'name'
		];

		process.stdout.write(chalk.bold.yellow(keys[0]) + '\t\t');
		process.stdout.write(chalk.bold.yellow(keys[1]) + '\t\t');
		process.stdout.write(chalk.bold.yellow(keys[2]) + '\t\n');
		console.log();
	   instances.forEach((instance) => {
		   		process.stdout.write(chalk.bold(instance.InstanceId) + '\t');
		   		if (instance.InstanceId.length === 10)
		   			process.stdout.write('\t');
		   		instance.PublicIpAddress = instance.PublicIpAddress || '          ';
		   		process.stdout.write(instance.State.Name + '\t\t');
		   		process.stdout.write(instance.Tags['0']['Value'] + '\t\t');
		   		console.log();
		   });
		 console.log();
		})
	}

	this.getInstances = function (parmas) {
		return new Promise ((resolve, reject) => {
			(new AWS.EC2()).describeInstances(function (err, result) {
				if (err) {
					reject(err);
				} else {
					var instances = [];
					result.Reservations
						  .forEach((reservation) => {
						  	reservation.Instances
						  			   .forEach((instance) => {
						  			   	instances.push(instance);
						  			   });
						  })
					resolve(instances);
				}
			})		
		});
	}

	this.getInstance = function (params) {
		return new Promise ((resolve, reject) => {
		this.getInstances().then((instances) => {
			for (var i = 0 ; i < instances.length; i++) {
				params.id = params.id || '';
				params.name = params.name || '';
				params.ip = params.ip || '';
				if (instances[i].InstanceId === params.id ||
					instances[i].Tags['0']['Value'] === params.name ||
					instances[i].PublicIpAddress === params.ip) {
					resolve(instances[i]);
				}	
			}
		})
	});
	}

	this.ssh = function (params) {
		if (typeof params === 'undefined') {
			return console.log("Missing required inputs.");			
		}
		this.getInstance(params).then((instance) => {
			var child = cp.spawn('ssh',
				['-i', 
				this.privateKeys + '/' + 
				instance.KeyName + '.pem',
				'ubuntu@' + instance.PublicIpAddress],
				{stdio: 'inherit'});
		});
	}

	this.mount = function (params) {
		this.getInstance(params).then((instance) => {
			var mountPoint = params.mountPoint || instance.Tags['0']['Value'];
			if (!fs.existsSync(mountPoint))
				fs.mkdirSync(mountPoint);
			var child = cp.spawn('sshfs',
				['-o', 'allow_other,' +
				'IdentityFile="' + this.privateKeys + '/' +
				instance.KeyName + '.pem' + '"',
				'ubuntu@' + instance.PublicIpAddress +
				':/home/ubuntu', mountPoint],
				{stdio: 'inherit'})
		})
	}

	this.umount = function (params) {
		cp.spawn('fusermount', ['-u',
					path.resolve(__dirname + '/' + params.host)],
					{stdio: 'inherit'});
	}

	this.start = function(params) {
		var ec2 = new AWS.EC2();
			ec2.startInstances ({
				InstanceIds: [params['instance-id']]
			}, function (err, result) {
				if (err) {
					console.log(chalk.yellow("Error: ", err.message))
					return process.exit(0);
				}

				try {
					if (result.StartingInstances[0].InstanceId === id)
						console.log(chalk.yellow("Starting " + id));
				} catch (err) {
					console.log(chalk.yellow("Error", err.message));
				}
			});
	}

	this.stop = function (params) {
		var ec2 = new AWS.EC2();
			ec2.stopInstances({InstanceIds: [params.id]},
			function (err, result) {
				if (err) {
					console.log(chalk.yellow("Error: ", err.message))
					return process.exit(0);				
				}
				try {
					if (result.StoppingInstances[0].InstanceId === id)
						console.log(chalk.yellow("Stopping " + id));
				} catch (err) {
					console.log(chalk.yellow("Error", err.message));
				}
			});
	}



	this.terminate = function  (params) {
		var ec2 = new AWS.EC2();

		terminateInstances({InstanceIds: [params.id]},
			function (err, result) {
				if (err) {
					console.log(chalk.yellow("Error: ", err.message));
					console.log(chalk.yellow('What went wrong?'));
					return process.exit(0);
				}

				try {
					if (result.TerminatingInstances[0].InstanceId === id)
						console.log(chalk.yellow("Terminating " + id));
						return process.exit(0);
				} catch (err) {
					console.log(chalk.yellow("Error", err.message));
					return process.exit(0);
				}
			});
	}
}