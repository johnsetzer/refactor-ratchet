var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var LineStream = require('byline').LineStream;

// consts
const PLUGIN_NAME = 'gulp-rr-line-counter';

// plugin level function (dealing with files)
function lineCounter(rrHelper) {
  
  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    var streamLineCount = 0;

    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var lineStream = new LineStream({ keepEmptyLines: true });
      
      lineStream.on('data', function(line) {
        streamLineCount++;
      });

      lineStream.on('end', function() {
        var metricKey = rrHelper.key + '.lineCount';
        rrHelper.setFileMetric(file, metricKey, streamLineCount);
        cb();
      });

      lineStream.on('error', this.emit.bind(this, 'error'));
      
      file.contents.pipe(lineStream);
    }

    this.push(file);
    
  });

  return stream;
};

module.exports = lineCounter;