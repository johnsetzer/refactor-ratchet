var _ = require('lodash');

var ConsoleReporter = {
	report: function (totalMetrics) {
		_(totalMetrics).forEach(function (v, k) {
			console.log(k, v);
		});
	}
};

module.exports = ConsoleReporter;