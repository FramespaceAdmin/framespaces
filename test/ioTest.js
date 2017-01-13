var _async = require('async'),
    MockIo = require('./mockIo'),
    itIsIO = require('./ioSpec');

// This tests both the client IO base-class, and MockIo (which extends it)
describe('MockIo', function () {
  itIsIO(_async.asyncify(MockIo));
});
