var gulp = require('gulp');
var through = require('through2');
var path = require('path');
var Stats = require('fast-stats').Stats;
var _ = require('lodash');
var lineCounter = require('./line_counter');

var Task = function (options) {
  this.key = options.key;
  this.paths = options.paths;
  this.syntheticTotals = options.syntheticTotals || function (totalMetrics, cb) { cb (); }
  this.done = options.done || function (err, totalMetrics, cb) { cb (); }
  this.totalMetrics = {};// totalMetrics[key]
  this.fileMetrics = {}; // fileMetrics[filePath][key]

  if (!this.key) {
    throw new Exception("RR: You must set a key.");
  }

  if (!this.paths) {
    throw new Exception("RR: You must set paths.");
  }
};

Task.prototype.helper = function () {
  var self = this;
  return {
    key: self.key,

    filePath: function (file) {
      return path.relative(process.cwd(), file.path);
    },

    getFileObj: function (file) {
      var filePath = this.filePath(file);
      var fileObj = self.fileMetrics[filePath];

      if (!fileObj) {
        fileObj = {};
        self.fileMetrics[filePath] = fileObj;
      }
      return fileObj;
    },

    setFileMetric: function (file, key, value) {
      if (arguments.length === 2) {
        value = key;
        key = self.key;
      }
      this.getFileObj(file)[key] = value;
    },

    setTotalMetric: function (key, value) {
      self.totalMetrics[key] = value;
    },
  };
};

Task.prototype.src = function (options) {
  // TODO: Do all of the prestream setup.
  return gulp.src(this.paths, options)
    .pipe(lineCounter(this.helper()))
};

Task.prototype.dest = function (destCb) {
  var task = this;

  var stream = through.obj(function(file, enc, cb) {
    if (typeof destCb !== 'function') {
      this.emit('error', new Error('RR: You didn\'t pass a cb to RR.Task.dest()' ));
    }

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
    task.totalMetrics = task.calcTotalMetrics();
    // TODO: Save totalMetrics to DB.
    task.syntheticTotals(task.totalMetrics, function (err) {
      if (err) { this.emit('error', new Error('RR: ' + err.toString())); }
      task.done(null, task.totalMetrics, destCb);
    });
  });

  return stream;
};

Task.prototype.calcTotalMetrics = function () {
  var keyVals = _.pluck(this.fileMetrics, this.key);

  var fileCount = keyVals.length;
  var nonZeroFileCount = 0;
  
  _.each(keyVals, function (v) {
    if (v !== 0) {
      nonZeroFileCount += 1;
    }
  });

  this.totalMetrics[this.key + '.fileCount'] = fileCount;
  this.totalMetrics[this.key + '.nonZeroFileCount'] = nonZeroFileCount;
  
  _.extend(this.totalMetrics, this.calcMetricStats(keyVals, this.key));

  var lineCountKey = this.key + '.lineCount';
  var lineCountVals = _.pluck(this.fileMetrics, lineCountKey);
  _.extend(this.totalMetrics, this.calcMetricStats(lineCountVals, lineCountKey));

  return this.totalMetrics;
};

Task.prototype.calcMetricStats = function (values, key) {
  var metrics = {};
  var sum = 0;
  
  _.each(values, function (v) {
    sum += v;
  });

  var stats = new Stats().push(values);
  var range = stats.range();

  metrics[key + '.sum'] = sum;
  metrics[key + '.mean'] = stats.amean();
  metrics[key + '.median'] = stats.median();
  metrics[key + '.min'] = range[0];
  metrics[key + '.max'] = range[1];
  metrics[key + '.stdDev'] = stats.stddev();

  return metrics;
};

// Task.prototype.loadFileMetrics = function () {
  
//  // Filled in later by promises
//  this.fileMetrics = {
//    trackedByGit: [], // Needs filtering by pattern
//    trackedByRR: [],
//    deletedSinceStart: [],
//    notInRR: [],
//    newerThanStart: [],
//    runMetricsOn: [],
//  };
//  this.range = null;
// };

module.exports = Task;
