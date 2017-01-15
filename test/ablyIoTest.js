var _ = require('lodash'),
    _async = require('async'),
    pass = require('pass-error'),
    Io = require('../client/io'),
    ClientIo = require('../client/io/ably'),
    ServerIo = require('../server/io/ably'),
    itIsBrowserIO = require('./browserIoSpec');

global.Ably = require('ably'); // Needed by client

describe('Ably IO', function () {
  itIsBrowserIO(function newClientIo(options, cb) {
    // Set up server authorisation
    options.serverIo.authorise(options.name, options.user.id, pass(function (auth) {
      options.resources = _.assign(options.resources, { channel : { auth : auth } });
      cb(false, new ClientIo());
    }, cb));
  }, ServerIo);
});
