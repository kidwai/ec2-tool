var Chalk = require('chalk');
exports.printTable = function (contents, keys, options) {
	var options = options || {};
	var spacing = options.spacing || 2;
	var chalk = options.chalk || {};

	var spacing = spacing || 2;
	var widths = new Array(contents.length).join(',')
										   .split(',')
										   .map(el => 4);

	for (var i = 0 ; i < contents.length; i++) {
		var content = contents[i];
		for (var j = 0 ; j < keys.length; j++) {
			var key = keys[j];
			if (content[key]) 
				var l = String(content[key]).length + spacing*2;

			if (l> widths[j])
				widths[j] = l;
		}
	}

	for (var j = 0 ; j < keys.length; j++) {
		var key = keys[j];
		var width = widths[j];
		var sidelen = width - key.length;
		var side = new Array(Math.ceil(sidelen/2)).join(' ');
		process.stdout.write(Chalk.bold.yellow(`${side}${keys[j]}${side}`))
	}
	console.log('\n');
	for (var i = 0 ; i < contents.length; i++) {
		var content = contents[i];
		for (var j = 0 ; j < keys.length; j++) {
			var key = keys[j];
			var width = widths[j];
			var it = content[key] || '';
			sidelen = (width - it.length )/2;
			if (key in chalk) {
				if (it in chalk[key]) it = Chalk.bold[chalk[key][it]](it);
			}

			var side = new Array(Math.ceil(sidelen)).join(' ');
			process.stdout.write(`${side}${it}${side}`);
		}
		console.log();
	}
	console.log();
}