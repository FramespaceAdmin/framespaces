/**
 * Configuration of aliasified modules for browser client.
 * NOTE This is a pre-processor.
 */
var _ = require('lodash'),
    modules = require('../lib/modules');

module.exports = {
  aliases : _.assign({
    config : './config', // Loads configuration from global in HTML
    request : 'xhr' // Client-side request (note request is used server-side for unit tests)
  }, modules)
};
