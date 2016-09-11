var _ = require('lodash'),
    config = require('config');

module.exports = _.mapValues(config.get('modules'), function (name, mod) {
  return './' + mod + '/' + name; // e.g. ./io/ably
});
