var Range = function (startCommit, endCommit) {
  this.start = startCommit;
  this.end = endCommit;
};

Range.prototype.toString = function () {
  return this.start.sha + '..' + this.end.sha;
};

module.exports = Range;