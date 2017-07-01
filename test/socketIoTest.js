var _ = require('lodash'),
    _async = require('async'),
    pass = require('pass-error'),
    Io = require('../client/io'),
    itIsBrowserIO = require('./browserIoSpec'),
    ClientIo = require('../client/io/socket-io'),
    ServerIo = require('../server/io/socket-io');

global.io = require('socket.io-client');

describe('Socket.io IO', function () {
  itIsBrowserIO(_async.asyncify(function newClientIo(name) {
    // Small latency for local round-trip
    return _.set(new ClientIo(name), 'latency', 10);
  }), _async.asyncify(function newServerIo(server) {
    return new ServerIo(server);
  }));
});
