var Task = require('../lib/task');
describe('Task', function () {
	var task;

	beforeEach(function () {
		task = new Task({
			key: 'key',
			paths: 'files/**/*.js'
		});
  });

	describe('calcMetricStats', function () {
  	it('calculates stats about metric', function () {
  		var stats = task.calcMetricStats([1, 2, 3], 'key');
	    expect(stats['key.sum']).toBe(6);
	    expect(stats['key.mean']).toBe(2);
	    expect(stats['key.median']).toBe(2);
	    expect(stats['key.min']).toBe(1);
	    expect(stats['key.max']).toBe(3);
	    expect(stats['key.stdDev']).toBe(0.816496580927726);
	  });
	});
});