// THIS SHOULD BE OWN MODULE ONE DAY

var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var LineStream = require('byline').LineStream;

// consts
const PLUGIN_NAME = 'gulp-rr-match-counter';

// plugin level function (dealing with files)
function matchCounter(rrHelper, searchString) {
  var patternCount = 0;
  var pattern = new RegExp(searchString, 'g');

  if (!pattern) {
    throw new PluginError(PLUGIN_NAME, 'Missing pattern.');
  }

  // creating a stream through which each file will pass
  var stream = through.obj(function(file, enc, cb) {
    if (file.isBuffer()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Buffers not supported!'));
      return cb();
    }

    if (file.isStream()) {
      var lineStream = new LineStream();
      
      lineStream.on('data', function(line) {
        var line = line.toString();
        var match = line.match(pattern);
        if (match) {
          patternCount += match.length;
        }

      });

      lineStream.on('end', function() {
        rrHelper.setMetric(file, patternCount);
        cb();
      });

      lineStream.on('error', this.emit.bind(this, 'error'));
      
      file.contents.pipe(lineStream);
    }

    this.push(file);
    
  });

  return stream;
};

module.exports = matchCounter;