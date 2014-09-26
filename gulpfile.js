var gulp = require('gulp');
var _ = require('lodash');
var RR = require('./index');
var Task = RR.Task;
var matchCounter = RR.matchCounter;

gulp.task('default', function(cb) {
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

      // At this point one could caluculate synthetic values such as:
      //totalMetrics['deprecatedFunc.filePercentage'] = totalMetrics['deprecatedFunc.nonZeroFileCount'] / totalMetrics['deprecatedFunc.fileCount'] * 100;
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
    .pipe(rr.dest(cb));
});

