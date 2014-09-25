var gulp = require('gulp');
var through = require('through2');

var Task = function (options) {
  this.key = options.key;
  this.paths = options.paths;
  this.syntheticTotals = options.syntheticTotals || function (totalMetrics, cb) { cb (); }
  this.done = options.done || function (err, totalMetrics, cb) { cb (); }
  this.totalMetrics = {};

  if (!this.key) {
  	throw new Exception("RR: You must set a key.");
  }

  if (!this.paths) {
  	throw new Exception("RR: You must set paths.");
  }
}

Task.prototype.src = function (options) {
	// TODO: Do all of the prestream setup.
	return gulp.src(this.paths, options);
}

Task.prototype.dest = function (destCb) {
	var task = this;
	var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      cb();
    }

    this.push(file);
    
  });

	stream.on('end', function() {
		// TODO: Save totalMetrics to DB.
		task.syntheticTotals(task.totalMetrics, function (err) {
			if (task.done) {
				task.done(null, task.totalMetrics, destCb);
			}
		});
	});

  return stream;
}

// Task.prototype.loadFileMetrics = function () {
	
// 	// Filled in later by promises
// 	this.fileMetrics = {
// 		trackedByGit: [], // Needs filtering by pattern
// 		trackedByRR: [],
// 		deletedSinceStart: [],
// 		notInRR: [],
// 		newerThanStart: [],
// 		runMetricsOn: [],
// 	};
// 	this.range = null;
// };

module.exports = Task;


// // TODO make example use through2
// 	function patternCount (file, enc, cb) {
//     console.log(path.relative(process.cwd(), file.path));
//     console.log(file);
//     this.push(file);
//     cb();
//   }