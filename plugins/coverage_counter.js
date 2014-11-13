var gulp = require('gulp');
var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var jasmine = require('gulp-jasmine');
var istanbul = require('gulp-istanbul');

// consts
const PLUGIN_NAME = 'gulp-rr-coverage-counter';

// plugin level function (dealing with files)
function coverageCounter(rrHelper, specFileFunc) {
  if (typeof specFileFunc !== 'function') {
    throw new PluginError(PLUGIN_NAME, 'Invalid specFileFunc.');
  }

  var coveredKey = rrHelper.key + '.covered';
  var totalKey = rrHelper.key + '.total';

  rrHelper.addTotalKey(coveredKey);
  rrHelper.addTotalKey(totalKey);
  rrHelper.addSyntheticTotaler(function (totalMetrics) {
    var key = rrHelper.key + '.truePercentage';
    var coveredLines = totalMetrics[coveredKey + '.sum'];
    var totalLines = totalMetrics[totalKey + '.sum'];
    var truePct =  coveredLines / totalLines * 100;
    totalMetrics[key] = truePct;
  })

  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var instrumentedPath = rrHelper.filePath(file);
      var specPath = specFileFunc(instrumentedPath);
      console.log('coveraging', instrumentedPath, specPath);

      // gulp-istanbul only takes buffers as of version 0.3.1
      // Instead of sending a pull request expediantly converting
      // to buffer.
      // TODO Do the above comment.
      // Right now we are being wasteful and not using provided stream?
      gulp.src([instrumentedPath]).pipe(istanbul({
        includeUntested: true
      }))
      .on('finish', function () {
        gulp.src([specPath]).pipe(jasmine({
          verbose: true
        }))
        .on('finish', function () {
          console.log('finished');
          var statements = istanbul.summarizeCoverage().statements;
          rrHelper.setFileMetric(file, rrHelper.key, statements.pct);
          rrHelper.setFileMetric(file, coveredKey, statements.covered);
          rrHelper.setFileMetric(file, totalKey, statements.total);
          cb();
        });
      });
    }

    this.push(file);
    
  });

  return stream;
};

module.exports = coverageCounter;
