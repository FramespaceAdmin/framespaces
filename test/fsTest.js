var MockPaper = require('./mockPaper'),
    MockIo = require('./mockIo'),
    MockTool = require('./mockTool'),
    MockUser = require('../client/user'),
    SetAction = require('./setAction'),
    EventEmitter = require('events'),
    pass = require('pass-error'),
    assert = require('chai').assert,
    proxyquire = require('proxyquire').noCallThru(),
    fs = proxyquire('../client/fs', {
      './user/local' : MockUser,
      './user/remote' : MockUser,
      './action' : SetAction,
      'io' : MockIo
    });

describe('Framespace client', function () {
  it('should report initialisation', function (done) {
    fs.load({}, function (localUser, commit) {
      assert.isObject(localUser);
      assert.isFunction(commit);
      done();
    }, { get : { body : [] } });
  });
});
