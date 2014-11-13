var gulp = require('gulp');
var through = require('through2');
var path = require('path');
var Stats = require('fast-stats').Stats;
var _ = require('lodash');
var taskFilter = require('./task_filter');
var lineCounter = require('./line_counter');
var Promise = require('bluebird');
var gitChanged = Promise.promisifyAll(require('git-changed'));
var FileMetric = Promise.promisifyAll(require('./models/file_metric'));
var TotalMetric = Promise.promisifyAll(require('./models/total_metric'));
var Sync = require('sync');

var Task = function (options) {
  this.key = options.key;
  this.paths = options.paths;
  this.syntheticTotals = options.syntheticTotals || function (totalMetrics) {}
  this.done = options.done || function (err, totalMetrics, cb) { cb (); }
  this.totalMetrics = {};// totalMetrics[key]
  this.fileMetrics = {}; // fileMetrics[filePath][key]
  this.totalKeys = [this.key]; // Keys we want to calc min, max, median, mean, etc.. on.
  this.syntheticTotalers = [];

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

    addTotalKey: function (key) {
      self.totalKeys.push(key);
    },

    addSyntheticTotaler: function (totaller) {
      self.syntheticTotalers.push(totaller);
    }
  };
};

Task.prototype.src = function (options, srcCallback) {
  var defaults = { buffer: false };
  // QUESTION:
  // Is it bad I am switching gulps default buffer mode to stream?
  options = _.extend(defaults, options);

  var promise = Promise.join(
    gitChanged.trackedFilesAsync('HEAD'),
    gitChanged.lastCommitAsync()
  )
  .bind(this)
  .spread(function(files, commit) {
    this.gitTrackedFiles = files;
    this.toCommit = commit;
    // The act of including this line causes
    // the app to hang for 10 seconds before closing
    return FileMetric.findMostRecent(new Date(commit.time)).bind(this);
  })
  .then(function(mostRecent) {
    // console.log('********** MOST RECENT *********');
    // mostRecent.forEach(function (fm) {
    //   console.log(fm.values);
    // });
    this.mostRecent = mostRecent;

    var newestFileMetric = null; // TODO iterate over most recent

    if (newestFileMetric) {
      var range =  newestFileMetric.sha + '..' + commit.sha;
      return gitChanged.changedFilesAsync(range).bind(this).success(function(changedFiles) {
        // console.log('********** CHANGED FILES *********');
        // changedFiles.forEach(function(f) {
        //   console.log(f.change, f.file);
        // });
        return Promise.resolve([changedFiles]).bind(this);
      });
    } else {
      return Promise.resolve([[]]).bind(this);
    }
    
  })
  .spread(function (changedFiles) {
    //console.log('AND THEN', changedFiles);
    this.chagedFiles = changedFiles;
    // filter changed for deleted files
    // filesToProcess = changed || untrackedByRR()


    this.filesToProcess = ['lib/range.js'];
    this.filesToProcess = _.sortBy(this.filesToProcess);
    console.log('THE END', this);
    return gulp.src(this.paths, options)
      .pipe(taskFilter(this.helper(), _.bind(this.filter, this)))
      .pipe(lineCounter(this.helper()))
  })
  .nodeify(srcCallback);
};

Task.prototype.filter = function (path) {
  return _.indexOf(this.filesToProcess, path, true) != -1;
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
    // TODO write new FileMetrics to DB
    var newFileMetrics = [];
    _.each(task.fileMetrics, function (fileMetrics, filePath) {
      _.each(fileMetrics, function (value, key) {
        var row = {
          key: key,
          filePath: filePath,
          value: value,
          sha: task.toCommit.sha,
          commitTime: new Date(task.toCommit.time)
        };

        newFileMetrics.push(
          FileMetric.findOrCreate({ where: row }, {})
        );
      });
    });

    Promise.all(newFileMetrics).then(function() {
      // TODO query a fresh set of FileMetrics.mostRecent() or do in process memory math to get new set
      task.totalMetrics = task.calcTotalMetrics();
      task.syntheticTotalers.forEach(function(totaler) {
        totaler(task.totalMetrics);
      });
      task.syntheticTotals(task.totalMetrics);
      // TODO: Save totalMetrics to DB.
      task.done(null, task.totalMetrics, destCb);
    }, function (err) {
      console.log(err);
    });
    
  });

  return stream;
};

// Aggregate fileMetrics to produce totalMetrics
Task.prototype.calcTotalMetrics = function () {
  // Keys we want to calc min, max, median, mean, etc.. on.
  var totalStatKeys = this.totalKeys.slice(0);
  
  // Calc stats on this.key by default
  //totalStatKeys.unshift(this.key);

  this._addFileCountMetrics(totalStatKeys);

  // Calc lineCount stats by default
  totalStatKeys.push(this.key + '.lineCount');
  
  _.each(totalStatKeys, function (key) {
    var keyVals = _.pluck(this.fileMetrics, key);
    _.extend(this.totalMetrics, this.calcMetricStats(keyVals, key));
  }, this);

  return this.totalMetrics;
};

Task.prototype._addFileCountMetrics = function (totalStatKeys) {
  var fileCount = 0;
  var nonZeroFileCount = 0;

  _.each(totalStatKeys, function (key) {
    var keyVals = _.pluck(this.fileMetrics, key);

    fileCount = keyVals.length;
    
    _.each(keyVals, function (v) {
      if (v !== 0) {
        nonZeroFileCount += 1;
      }
    });

    if (key === this.key) {
      this.totalMetrics[key + '.fileCount'] = fileCount;
    }
    this.totalMetrics[key + '.nonZeroFileCount'] = nonZeroFileCount;
  }, this);
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
