var _ = require('lodash'),
    as = require('yavl');

/**
 * Snapshot struct
 */
exports.SNAPSHOT = as({
  lastEventId : String, // Note this means, no inital state snapshots
  state : String,
  timestamp : Number
});

/**
 * Event trait
 */
exports.EVENT = as({
  id : String,
  timestamp : Number,
  undefined : as
});

/**
 * Normalise an array or single datum to an EVENT with the given timestamp
 */
exports.from = function (data, timestamp) {
  return _(data).castArray().map(function (datum) {
    return exports.EVENT.validate(_.set(datum, 'timestamp', timestamp));
  }).value();
};