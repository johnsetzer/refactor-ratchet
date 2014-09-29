var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var fs = require('fs');

// consts
const PLUGIN_NAME = 'gulp-rr-matching-file-counter';

// plugin level function (dealing with files)
function matchingFileCounter(rrHelper, matchingfileFunc) {
  if (typeof matchingfileFunc !== 'function') {
    throw new PluginError(PLUGIN_NAME, 'Invalid matchingfileFunc.');
  }

  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var path = rrHelper.filePath(file);
      var expectedPath = matchingfileFunc(path);

      fs.exists(expectedPath, function (exists) {
        var existCount = exists ? 1 : 0;
        rrHelper.setFileMetric(file, existCount);
        
        cb();
      });
    }

    this.push(file);
  });

  return stream;
};

module.exports = matchingFileCounter;