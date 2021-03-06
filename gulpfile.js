var gulp = require('gulp');
gulp = require('gulp-help')(gulp);
var jasmine = require('gulp-jasmine');
var istanbul = require('gulp-istanbul');
var _ = require('lodash');

// NOTE:
// All refactor-ratchet dependencies are required in
// task functions to prevent require from loading
// pre-instrumented source files in the test-coverage task.

gulp.task('rr-deprecated', 'RR deprecated function calls', function(taskCb) {
  var RR = require('./index');
  var rr = new RR.Task({
  	key: 'deprecatedFunc',
  	paths: ['./lib/**/*.js', './plugins/**/*.js'],

    // Chance to calculate your own total metrics before RR flushes them to the database.
    syntheticTotals: function (totalMetrics) {
      // totalMetrics automatically includes:
      // 'deprecatedFunc.fileCount'
      // 'deprecatedFunc.nonZeroFileCount'
      // 'deprecatedFunc.sum'
      // 'deprecatedFunc.mean'
      // 'deprecatedFunc.median'
      // 'deprecatedFunc.min'
      // 'deprecatedFunc.max'
      // 'deprecatedFunc.stdDev'
      // deprecatedFunc.lineCount.sum
      // deprecatedFunc.lineCount.mean
      // deprecatedFunc.lineCount.median
      // deprecatedFunc.lineCount.min
      // deprecatedFunc.lineCount.max
      // deprecatedFunc.lineCount.stdDev

      // At this point one could caluculate synthetic values such as:
      totalMetrics['deprecatedFunc.filePercentage'] = totalMetrics['deprecatedFunc.nonZeroFileCount'] / totalMetrics['deprecatedFunc.fileCount'] * 100;
      // Lots of the places you might copy this data to might
      // be better places to caluculate synthetic values on an ad-hoc basis.
    },

    // Called before RR exits
  	done: function (err, totalMetrics, commit, cb) {
      if (err) { console.log(err); cb(); return; }
	  	// Log to console
	  	_(totalMetrics).forEach(function (v, k) {
		  	console.log(k, v);
		  });

  		// Send metrics somewhere useful.
  		// Example: Wavefront, Ganglia, SumoLogic, Splunk, etc...
	  	RR.WavefrontReporter.report(totalMetrics, commit, cb);
	  }
	});

  rr.src({}, function(err, src) {
    src
      .pipe(RR.matchCounter(rr.helper(), 'console.log'))
      .pipe(rr.dest(taskCb));
  });
});

gulp.task('rr-long-files', 'RR files that are too long', function(taskCb) {
  var RR = require('./index');
  var rr = new RR.Task({
    key: 'longFiles',
    paths: ['./lib/**/*.js', './plugins/**/*.js'],

    done: function (err, totalMetrics, commit, cb) {
      if (err) { console.log(err); cb(); return; }
      RR.ConsoleReporter.report(totalMetrics);
      RR.WavefrontReporter.report(totalMetrics, commit, cb);
    }
  });

  // 20 isn't too long, but it returns some trues on our data set.
  var maxlineCount = 20;

  rr.src({}, function(err, src) {
    src
      .pipe(RR.longFileCounter(rr.helper(), maxlineCount))
      .pipe(rr.dest(taskCb));
  });
});

var calcTestPath = function (jsPath) {
  var matches = jsPath.match(/(lib|plugins)\/(.*)(\.js)/);
  var testPath = 'spec/' + matches[2] + '_spec.js';
  return testPath;
};

gulp.task('rr-has-test-file', 'RR lib files with spec files', function(taskCb) {
  var RR = require('./index');
  var rr = new RR.Task({
    key: 'hasTestFile',
    paths: ['./lib/**/*.js', './plugins/**/*.js'],

    done: function (err, totalMetrics, commit, cb) {
      if (err) { console.log(err); cb(); return; }
      RR.ConsoleReporter.report(totalMetrics);
      RR.WavefrontReporter.report(totalMetrics, commit, cb);
    }
  });

  rr.src({}, function(err, src) {
    src
    .pipe(RR.matchingFileCounter(rr.helper(), calcTestPath))
    .pipe(rr.dest(taskCb));
  });
});

gulp.task('rr-coverage', 'RR test coverate', function(taskCb) {
  var Task = require('./lib/task');
  var ConsoleReporter = require('./plugins/console_reporter');
  var WavefrontReporter = require('./plugins/wavefront_reporter');
  var coverageCounter = require('./plugins/coverage_counter');

  var rr = new Task({
    key: 'coverage',
    paths: ['./lib/**/*.js', './plugins/**/*.js'],

    done: function (err, totalMetrics, commit, cb) {
      if (err) { console.log(err); cb(); return; }
      ConsoleReporter.report(totalMetrics);
      WavefrontReporter.report(totalMetrics, commit, cb);
    }
  });

  rr.src({}, function(err, src) {
    src
      .pipe(coverageCounter(rr.helper(), calcTestPath))
      .pipe(rr.dest(taskCb));
  });
  
});

gulp.task('ratchet', 'Run all RR tasks', [
  'rr-deprecated',
  'rr-long-files',
  'rr-has-test-file',
  'rr-coverage'
]);

gulp.task('test', 'Run unit tests', function () {
  return gulp.src('spec/**/*.js')
    .pipe(jasmine({
      verbose: true
    }));
});

gulp.task('test-coverage', 'Run unit tests with test coverage', function (cb) {
  gulp.src(['./lib/**/*.js', './plugins/**/*.js'])
    .pipe(istanbul({
      includeUntested: true
    }))
    .on('finish', function () {
      gulp.src(['spec/**/*.js'])
        .pipe(jasmine({
          verbose: true
        }))
        .pipe(istanbul.writeReports())
        .on('end', cb);
    });
});

gulp.task('default', 'Run all RR tasks', ['ratchet']);

