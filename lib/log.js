var _ = require('lodash'),
    log = require('loglevel'),
    config = require('config');

log.setLevel(config.log);
log.info('Log level:', _.invert(log.levels)[log.getLevel()]);

module.exports = log;
