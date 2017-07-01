var _ = require('lodash'),
    log = require('loglevel'),
    config = require('config');

log.setLevel(config.get('log'));
log.info('Log level:', _.invert(log.levels)[log.getLevel()]);
log.scale = function (max, direction) {
  var scaled = Math.ceil(max/5 * log.getLevel());
  return direction < 0 ? max - scaled : scaled;
};

module.exports = log;
