var lineCounter = require('../lib/line_counter');
var Task = require('../lib/task');
var gulp = require('gulp');

describe('lineCounter', function () {
	var filePath, task, helper;

	beforeEach(function () {
		filePath = 'spec/spec_inputs/line_counter.txt';
		task = new Task({
			key: 'key',
			paths: filePath
		});
		helper = task.helper();
  });

	describe('calcMetricStats', function () {
  	it('count the number of lines in a file and sets them with task.helper', function (cb) {
  		
  		gulp.src(filePath, { buffer: false })
  			.pipe(lineCounter(helper))
  			.on('finish', function () {
  				expect(task.fileMetrics[filePath]['key.lineCount']).toBe(4);
  				cb();	
  			});
	  });
	});
});