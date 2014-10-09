var gulp = require('gulp');
gulp = require('gulp-help')(gulp);
var jasmine = require('gulp-jasmine');
var istanbul = require('gulp-istanbul');
var _ = require('lodash');
var RR = require('./index');
var Task = RR.Task;
var ConsoleReporter = RR.ConsoleReporter;
var matchCounter = RR.matchCounter;
var longFileCounter = RR.longFileCounter;
var matchingFileCounter = RR.matchingFileCounter;

gulp.task('rr-deprecated', 'RR deprecated function calls', function(taskCb) {
  var rr = new Task({
  	key: 'deprecatedFunc',
  	paths: ['./lib/*.js'],

    // Chance to calculate your own total metrics before RR flushes them to the database.
    syntheticTotals: function (totalMetrics, cb) {
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
      // Lots of the places you might copy this data might 
      // be better places to caluculate synthetic values on an ad-hoc basis.
      cb();
    },

    // Called before RR exits
  	done: function (err, totalMetrics, cb) {
	  	// Log to console
	  	_(totalMetrics).forEach(function (v, k) {
		  	console.log(k, v);
		  });

  		// Send metrics somewhere useful.
  		// Example: Wavefront, Ganglia, SumoLogic, Splunk, etc...
	  	cb();
	  }
	});

  rr.src({ buffer: false })
    .pipe(matchCounter(rr.helper(), 'console.log'))
    .pipe(rr.dest(taskCb));
});

gulp.task('rr-long-files', 'RR files that are too long', function(taskCb) {
  var rr = new Task({
    key: 'longFiles',
    paths: ['./lib/*.js'],

    done: function (err, totalMetrics, cb) {
      ConsoleReporter.report(totalMetrics);
      cb();
    }
  });

  rr.src({ buffer: false })
    .pipe(longFileCounter(rr.helper(), 20))
    .pipe(rr.dest(taskCb));
});

gulp.task('rr-has-test-file', 'RR lib files with spec files', function(taskCb) {
  var rr = new Task({
    key: 'hasTestFile',
    paths: ['./lib/*.js'],

    done: function (err, totalMetrics, cb) {
      ConsoleReporter.report(totalMetrics);
      cb();
    }
  });

  var testPath = function (jsPath) {
    var matches = jsPath.match(/lib\/(.*)(.js)/);
    var testPath = 'tests/' + matches[1] + '_spec.js';
    return testPath;
  };

  rr.src({ buffer: false })
    .pipe(matchingFileCounter(rr.helper(), testPath))
    .pipe(rr.dest(taskCb));
});

gulp.task('ratchet', 'Run all RR tasks', ['rr-deprecated', 'rr-long-files', 'rr-has-test-file']);

gulp.task('test', 'Run unit tests', function () {
  return gulp.src('spec/**/*.js')
    .pipe(jasmine({
      verbose: true
    }));
});

gulp.task('test-coverage', 'Run unit tests with test coverage', function (cb) {
  gulp.src(['lib/**/*.js'])
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

