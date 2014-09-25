var gulp = require('gulp');
var through = require('through2');
var path = require('path');
var Stats = require('fast-stats').Stats;
var _ = require('lodash');

var Task = function (options) {
  this.key = options.key;
  this.paths = options.paths;
  this.syntheticTotals = options.syntheticTotals || function (totalMetrics, cb) { cb (); }
  this.done = options.done || function (err, totalMetrics, cb) { cb (); }
  this.totalMetrics = {};
  this.fileMetrics = {};

  if (!this.key) {
  	throw new Exception("RR: You must set a key.");
  }

  if (!this.paths) {
  	throw new Exception("RR: You must set paths.");
  }
}

Task.prototype.helper = function () {
	var self = this;
	return {
		filePath: function (file) {
			return path.relative(process.cwd(), file.path);
		},

		setMetric: function (file, value) {
			self.fileMetrics[this.filePath(file)] = value;
		}
	};
};

Task.prototype.src = function (options) {
	// TODO: Do all of the prestream setup.
	return gulp.src(this.paths, options);
}

Task.prototype.dest = function (destCb) {
	var task = this;
	var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new Error('RR: Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      cb();
    }

    this.push(file);
    
  });

	// TODO Why does 'end' never fires if I don't have this.
  stream.on('data', function (data) {
  });

	stream.on('end', function() {
		task.totalMetrics = task.calcStats();
		// TODO: Save totalMetrics to DB.
		task.syntheticTotals(task.totalMetrics, function (err) {
			if (err) { this.emit('error', new Error('RR: ' + err.toString())); }
			task.done(null, task.totalMetrics, destCb);
		});
	});

  return stream;
}

Task.prototype.calcStats = function () {
	var totalMetrics = {};
	var vals = _.values(this.fileMetrics);
	var sum = 0;
	var fileCount = vals.length;
	var nonZeroFileCount = 0;
	
	_.each(vals, function (v) {
		sum += v;
		if (v !== 0) {
			nonZeroFileCount += 1;
		}
	});

	var stats = new Stats().push(vals);
	var range = stats.range();

	totalMetrics[this.key + '.fileCount'] = fileCount;
	totalMetrics[this.key + '.nonZeroFileCount'] = nonZeroFileCount;
	totalMetrics[this.key + '.sum'] = sum;
	totalMetrics[this.key + '.mean'] = stats.amean();
	totalMetrics[this.key + '.median'] = stats.median();
	totalMetrics[this.key + '.min'] = range[0];
	totalMetrics[this.key + '.max'] = range[1];
	totalMetrics[this.key + '.stdDev'] = stats.stddev();

	return totalMetrics;
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
