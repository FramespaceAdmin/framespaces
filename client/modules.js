/**
 * Configuration of aliasified modules for browser client.
 * NOTE This is a pre-processor.
 */
var _ = require('lodash'),
    _fs = require('fs'),
    _path = require('path'),
    config = require('config'),
    modules = require('../lib/modules');

module.exports = {
  aliases : _.assign({
    config : './config', // Loads configuration from dist JSON, see below
    request : 'xhr' // Client-side request
  }, modules)
};

// Statically write out the configuration to the dist folder
_fs.writeFileSync(_path.join(__dirname, '../dist', 'config.json'), JSON.stringify(config));
