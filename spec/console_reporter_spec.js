var ConsoleReporter = require('../plugins/console_reporter');

describe('ConsoleReporter', function () {
	describe('report', function () {
  	it('calls console.log with the key value pairs', function () {
  		var metrics = {
				sprockets: 10,
				widgets: 15
			};
			spyOn(console, 'log');
			ConsoleReporter.report(metrics);
	    //expect(console.log.callCount).toBe(2);
	    // TODO check for key value pairs
	  });
	});
});