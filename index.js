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
			'state',
			'ip',
			'name'
		];



		for (var i = 0 ; i < keys.length; i++) {
			if (keys[i] === 'name')
				keys[i] += '           ';

			process.stdout.write(chalk.bold.yellow(keys[i]) + '                ')
		}
		console.log('\n');
	   instances.forEach((instance) => {

			if (typeof instance.PublicIpAddress == 'undefined' &&
				typeof instance.PublicDnsName !== 'undefined')
				instance.PublicIpAddress = instance.PublicDnsName
													.split('-')
													.slice(1, 4)
													.join('.');

			instance.Tags.forEach((tag) =>{
				if (tag.Key.toLowerCase() === 'name') {
					instance.name = tag.Value;		   				
				}
			});

			instance.ip = instance.PublicIpAddress;
			instance.state = instance.State.Name;

			stateColours = {
				stopped: 'red',
				terminated: 'red',
				running: 'green',
				stopping: 'blue',
				starting: 'green'
			}

			color = stateColours[instance.state]

			instance.state = chalk[stateColours[instance.state]](instance.state)
			instance.ip    = chalk[stateColours[instance.State.Name]](instance.ip)
			if (instance.State.Name === 'running') {
				instance.state = chalk.bold(instance.state)
				instance.ip = chalk.bold(instance.ip)
				instance.name = chalk.bold(instance.name)
			}

			keys = ['state', 'ip', 'name']

			while (instance.ip.length < 14)
				instance.ip += ' ';

			process.stdout.write(instance.state + '\t\t'  + instance.ip + '\t\t' + instance.name + '\n')

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
										if (typeof instance.PublicIpAddress == 'undefined' &&
												typeof instance.PublicDnsName !== 'undefined')
												instance.PublicIpAddress = instance.PublicDnsName
																					.split('-')
																					.slice(1, 4)
																					.join('.');
										instance.ip = instance.PublicIpAddress;
										instance.Tags.forEach(function (tag) {
											if (tag.Key === 'Name')
												instance.name = tag.Value;
										})
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
					instances[i].name === params.name ||
					instances[i].ip === params.ip) {
					resolve(instances[i]);
				}
				else if (i+1 === instances.length) {
					console.log(chalk.bold.red('error: instance not found'));
					reject(err);							
				}
			}
		}).catch(()=>{});
	});
	}

	this.ssh = function (params) {
		return new Promise ((resolve, reject) => {
			if (typeof params === 'undefined') {
				reject( console.log("Missing required inputs."));			
			}
			this.getInstance(params).then((instance) => {
				var child = cp.spawn('ssh',
					['-i', 
					this.privateKeys + '/' + 
					instance.KeyName + '.pem',
					'ubuntu@' + instance.ip, params.command || ''],
					{stdio: 'inherit'});
				child.stdout.on('data', (dat) => {console.log(dat.toString('utf-8'))})
			}).catch(()=>{});
		})
	}

	this.sftp = function (params) {
		return new Promise ((resolve, reject) => {
			if (typeof params === 'undefined') {
				reject( console.log("Missing required inputs."));
			}

			this.getInstance(params).then( (instance) => {
				var child = cp.spawn('sftp', 
					[
						'-i',
						this.privateKeys + '/' + instance.KeyName + '.pem',
						'ubuntu@' + instance.ip
					],
					 {stdio: 'inherit'}
					);
				resolve(child);
			}).catch(()=>{});
		})
	}


	this.exec = function (params) {
		var cmd = params.command;
		return new Promise ((resolve, reject) => {
			if (typeof params === 'undefined') {
				reject( console.log("Missing required inputs."));
			}

			this.getInstance(params).then( (instance) => {
				var child = cp.spawn('ssh', 
					[
						'-i',
						this.privateKeys + '/' + instance.KeyName + '.pem',
						'ubuntu@' + instance.ip,
						cmd
					],
					 {stdio: 'inherit'}
					);
				resolve(child);
			}).catch(()=>{});
		})
	}



	this.mount = function (params) {
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

			cp.exec(`sshfs -o allow_other,IdentityFile=${process.env.HOME}/.aws/keys/${instance.KeyName}.pem ${mountPoint} ubuntu@${instance.ip}:/home/ubuntu`, 
					function (err, resut) {
						if (!err) {
							console.log(chalk.bold.yellow('Mounted ' + instance.ip + ' to ' + mountPoint));						
						} else {
							console.log(chalk.bold.red("error:") + err.msg)
							return;
						}
					})
		}).catch(()=>{});
	}

	this.umount = function (params) {
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


	this.start = function (params) {
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

	this.stop = function (params) {
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






	this.terminate = function (params) {
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

}
