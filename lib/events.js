var _ = require('lodash');

exports.from = function (data, timestamp) {
  return _(data).castArray().map(function (datum) {
    return _.set(datum, 'timestamp', timestamp);
  }).value();
};