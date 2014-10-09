var Commit = function (sha, time) {
  this.sha = sha || 'master'; // Is this a sane default?
  this.time = time || 0;  // Assumed to be ms since unix epoch
}

module.exports = Commit;