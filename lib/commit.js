var Commit = function (sha, time) {
  this.sha = sha || 'master'; // Is this a sane default?
  this.time = time || 0;  // Assumed to be seconds since unix epoch
}

Commit.prototype.getDate = function () {
	return new Date(this.time * 1000);
};

module.exports = Commit;