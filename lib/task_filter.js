var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

// consts
const PLUGIN_NAME = 'gulp-rr-task-filter';

// plugin level function (dealing with files)
function taskFilter(rrHelper, filterFunc) {
  
  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    var streamLineCount = 0;

    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var path = rrHelper.filePath(file);
      if (filterFunc(path)) {
        this.push(file);
      }
      cb();
    }
  });

  return stream;
};

module.exports = taskFilter;