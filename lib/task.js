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
var Commit = require('./commit');

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
    this.gitTrackedPaths = files;
    this.toCommit = new Commit(commit.sha, commit.time);
    // BUG:
    // The act of including this line causes
    // the app to hang for 10 seconds before closing
    // DB closing issue?...I think but am not 100% sure all promises are satisfied.
    return FileMetric.findMostRecent(this.toCommit.getDate()).bind(this);
  })
  .then(function(rrMostRecentFiles) {

    this.rrMostRecentFiles = rrMostRecentFiles;

    if (!_.isEmpty(this.rrMostRecentFiles)) {
      var newestFileMetric = _.max(this.rrMostRecentFiles, 'commitTime');
      var range =  newestFileMetric.sha + '..' + this.toCommit.sha;
      //console.log(range);
      
      return gitChanged.changedFilesAsync(range).bind(this).then(function(changedFiles) {
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
    // Files Added or Modified in git
    this.gitChangedPaths = _.chain(changedFiles)
      .reject({ 'change': 'D' })
      .pluck('file').value();

    // Paths RR tracks  = rrMostRecent - deletedFiles - gitChangedPaths
    //console.log('ONE', this.rrMostRecentFiles)
    this.rrMostRecentPaths = _.pluck(this.rrMostRecentFiles, 'filePath')
    //console.log('TWO', this.rrMostRecentPaths)
    this.rrMostRecentPaths = _.uniq(this.rrMostRecentPaths);
    //console.log('THREE', this.rrMostRecentPaths)
    this.rrMostRecentPaths = _.intersection(this.rrMostRecentPaths, this.gitTrackedPaths);
    
    //console.log('FOUR', this.rrMostRecentPaths)
    this.rrMostRecentPaths = _.difference(this.rrMostRecentPaths, this.gitChangedPaths);
    //console.log('FIVE', this.rrMostRecentPaths)

    // gitTracked - rrMostRecent - rrChanged
    this.rrUntrackedPaths = _.difference(this.gitTrackedPaths, this.rrMostRecentPaths);
    this.rrUntrackedPaths = _.difference(this.rrUntrackedPaths, this.gitChangedPaths);

    // gitChanged + rrUntracked
    this.rrPathsToSave = _.union(this.gitChangedPaths, this.rrUntrackedPaths);
    this.rrPathsToSave = _.sortBy(this.rrPathsToSave);

    // console.log('this.gitChangedPaths', this.gitChangedPaths, this.gitChangedPaths.length)
    // console.log('this.rrMostRecentPaths', this.rrMostRecentPaths, this.rrMostRecentPaths.length)
    // console.log('this.rrUntrackedPaths', this.rrUntrackedPaths, this.rrUntrackedPaths.length)
    // console.log('this.rrPathsToSave', this.rrPathsToSave, this.rrPathsToSave.length)
    // process.exit();

    // Files RR tracks - deletedFiles - gitChangedPaths
    this.rrMostRecentFiles = _.filter(this.rrMostRecentFiles, function (mrf) {
      return _.include(this.rrMostRecentPaths, mrf.filePath);;
    }, this);
    
    console.log('THE END', this);
    return gulp.src(this.paths, options)
      .pipe(taskFilter(this.helper(), _.bind(this.filter, this)))
      .pipe(lineCounter(this.helper()))
  })
  .nodeify(srcCallback);
};

Task.prototype.filter = function (path) {
  return _.indexOf(this.rrPathsToSave, path, true) != -1;
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
    var newFileMetricsPromises = [];
    var newFileMetrics = [];
    _.each(task.fileMetrics, function (fileMetrics, filePath) {
      _.each(fileMetrics, function (value, key) {
        var where = {
          key: key,
          filePath: filePath,
          sha: task.toCommit.sha
        };

        var row = {
          value: value,
          commitTime: task.toCommit.getDate()
        };

        newFileMetricsPromises.push(
          FileMetric.findOrCreate({ where: where, defaults: row })
            .spread(function (fm, created) {
              newFileMetrics.push(fm);
            })
        );
      });
    });

    newFileMetricsPromises = [];

    Promise.all(newFileMetricsPromises).then(function() {
      // TODO I don't think I need this var
      task.totalFileMetrics = _.union(newFileMetrics, this.rrMostRecentFiles);
      task.totalMetrics = task.calcTotalMetrics();
      
      task.syntheticTotalers.forEach(function(totaler) {
        totaler(task.totalMetrics);
      });
      task.syntheticTotals(task.totalMetrics);
      
      task.saveTotalMetrics().then(function () {
        task.done(null, task.totalMetrics, destCb);
      }, function (err) {
        console.log(err);
      });
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

Task.prototype.saveTotalMetrics = function () {
  // TODO
  // This will resave all the metrics each
  // time the script is run.
  // Do we care about findOrCreate here? 
  var totalRows = _.map(this.totalMetrics, function (v, k) {
    return {
      key: k,
      value: v,
      sha: this.toCommit.sha,
      commitTime: this.toCommit.getDate()
    };
  }, this);

  return TotalMetric.bulkCreate(totalRows);
};

module.exports = Task;
