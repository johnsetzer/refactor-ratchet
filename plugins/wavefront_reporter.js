var request = require('request');
var _ = require('lodash');

// TODO: There is probably a better way to pass options
var wavefrontHost = process.env.HOST || 'jsetzer-laptop';
var wavefrontPrefix = process.env.PREFIX || 'jsetzer';
var projectName = process.env.PROJECT || 'refactorRatchet';

var reportToWavefront = function (totalMetrics, cb) {
  var body = '';
  _(totalMetrics).forEach(function (v, k) {
    var time = Math.round(new Date().getTime() / 1000);
    var key = wavefrontPrefix
    + '.rr.' 
    + projectName 
    + '.'
    + k;
    body += key + ' ' + v + ' ' + time + '\n';
  });
  //console.log('BODY', body);
   
  request({
    method: 'POST',
    uri: 'http://chipper.sjc1.yammer.com/queues/graphite-metrics',
    qs: { hostname: wavefrontHost },
    body: body
  }, function(error, response, body) {
    if (error) { console.log(error); cb(); return;}
    console.log('Reported to Wavefront with response code =', response.statusCode);
    //console.log('BODY', body);
    cb();
  });
};

module.exports.report = reportToWavefront;