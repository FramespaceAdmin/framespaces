var _ = require('lodash'),
    _async = require('async'),
    pass = require('pass-error'),
    Io = require('../client/io'),
    ClientIo = require('../client/io/socket-io'),
    ServerIo = require('../server/io/socket-io'),
    itIsBrowserIO = require('./browserIoSpec');

global.io = require('socket.io-client');

describe('Socket.io IO', function () {
  itIsBrowserIO(_async.asyncify(function newClientIo() {
    return new ClientIo();
  }), ServerIo);
});
