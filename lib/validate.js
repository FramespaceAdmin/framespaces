var _ = require('lodash'),
    _fs = require('fs'),
    _path = require('path'),
    _async = require('async'),
    log = require('./log'),
    ajv = new (require('ajv'))({
      verbose : log.getLevel() <= log.levels.DEBUG,
      allErrors : log.getLevel() <= log.levels.DEBUG
    });

/**
 * Read all the available schemas and create an async validation function for each.
 * Validation function takes an object of the expected type and a callback(err).
 */
_.each(_fs.readdirSync(_path.join(__dirname, '../schema')), function (schema) {
  var type = _path.parse(schema).name, validate = ajv.compile(require('../schema/' + type));
  log.debug('Compiled', type, 'schema');
  exports[type] = _async.asyncify(function (object) {
    if (!_.every(_.castArray(object), validate)) {
      log.debug(validate.errors);
      throw 'Validation failed';
    }
  });
});
