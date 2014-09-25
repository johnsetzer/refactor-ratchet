var ConsoleReporter = function () {
};

ConsoleReporter.prototype.report = fuction (totalMetrics) {
	totalMetrics.forEach(function (m) {
		console.log(m);
	});
}

module.exports = ConsoleReporter;