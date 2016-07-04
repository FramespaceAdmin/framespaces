var _ = require('lodash'),
    log = require('loglevel');

log.setLevel(process.env.LOG_LEVEL || log.levels.INFO);
log.info('Log level:', _.invert(log.levels)[log.getLevel()]);

module.exports = log;
