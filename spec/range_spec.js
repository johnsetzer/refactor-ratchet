var Range = require('../lib/range');
var Commit = require('../lib/commit');

describe('Range', function () {
	var fromCommit, toCommit, range;

	beforeEach(function () {
		fromCommit = new Commit('fromSha', 1);
  	toCommit = new Commit('toSha', 2);
  	range = new Range(fromCommit, toCommit);
	});

	describe('Constructor', function () {
  	it('sets properties', function () {
	    expect(range.start).toBe(fromCommit);
	    expect(range.end).toBe(toCommit);
	  });
	});

  describe('toString', function () {
  	it('returns a from..to range', function () {
	    expect(range.toString()).toBe('fromSha..toSha');
	  });
	});
});