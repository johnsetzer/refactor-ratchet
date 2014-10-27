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

  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var instrumentedPath = rrHelper.filePath(file);
      var specPath = specFileFunc(instrumentedPath);
      console.log('processing', instrumentedPath, specPath)


      gulp.src(specPath)
        .pipe(jasmine({
          verbose: true
        })).on('finish', function () {
            console.log('finished')
            // var data = istanbul.summarizeCoverage();
            // console.log(data);
            // rrHelper.setFileMetric(file, rrHelper.key + '.covered', 1);
            // rrHelper.setFileMetric(file, rrHelper.key + '.total', 2);
            rrHelper.setFileMetric(file, 2);
            cb();
          });
      
      // file.contents.pipe(istanbul({
      //   includeUntested: true
      // }))
      // .on('finish', function () {
        // gulp.src([specPath])
        //   .pipe(jasmine({
        //     verbose: true
        //   }))
        //   .on('finish', function () {
        //     console.log('finished')
        //     // var data = istanbul.summarizeCoverage();
        //     // console.log(data);
        //     rrHelper.setFileMetric(file, rrHelper.key + '.covered', 1);
        //     rrHelper.setFileMetric(file, rrHelper.key + '.total', 2);
        //     cb();
        //   });
      // });
    }

    this.push(file);
    
  });

  return stream;
};

module.exports = coverageCounter;
