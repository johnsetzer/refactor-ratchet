var Commit = require('../lib/commit');

describe('Commit', function () {
  describe('Contructor', function () {
  	it('set properties', function () {
  		var commit = new Commit('sha', 1);
	    expect(commit.sha).toBe('sha');
	    expect(commit.time).toBe(1);
	  });
	});
});