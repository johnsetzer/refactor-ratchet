var Metric = function (key, pattern, valFunc) {
  this.key = key;
  this.pattern = pattern; // TODO turn into globby pattern
  this.valFunc = valFunc;
}

module.exports = Metric;