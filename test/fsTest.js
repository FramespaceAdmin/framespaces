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
    fs.load({}, function (user, commit) {
      assert.isObject(user);
      assert.isFunction(commit);
      done();
    }, { get : { body : [] } });
  });

  it('should publish a local action', function (done) {
    var events = new EventEmitter(), subject = {};
    events.on('action', function (userId, data) {
      assert.deepEqual(data, { id : 'a' })
      done();
    });
    fs.load(subject, function (user, commit) {
      var seta = new SetAction({ id : 'a' });
      seta.do(subject);
      commit(seta);
    }, { get : { body : [] }, events : events });
  });

  it('should apply a remote action (before loaded)', function (done) {
    var subject = {};
    fs.load(subject, function (user, commit) {
      assert.isTrue(subject.a);
      done();
    }, { get : { body : [{ id : 'a' }] } });
  });

  it('should apply a remote action (during load)', function (done) {
    var events = new EventEmitter(), subject = {};
    fs.load(subject, function (user, commit) {
      assert.isTrue(subject.a);
      done();
    }, { get : function (path, cb/*(err, body)*/) {
      events.emit('action', 'uid', { id : 'a' });
      setTimeout(function () { // Event is received async
        cb(false, []);
      }, 0);
    }, events : events });
  });

  it('should apply a remote action (after loaded)', function (done) {
    var events = new EventEmitter(), subject = {};
    fs.load(subject, function (user, commit) {
      events.emit('action', 'uid', { id : 'a' });
      setTimeout(function () { // Event is received async
        assert.isTrue(subject.a);
        done();
      }, 0);
    }, { get : { body : [] }, events : events });
  });

  it('should reset state if local actions not in channel order', function (done) {
    var events = new EventEmitter(), subject = {
      set : function (key) {
        if (key === 'a') {
          assert.isTrue(!subject.b, 'Action a should be applied first');
        } else if (key === 'b' && subject.a) {
          done();
        }
        subject[key] = true;
      }
    };
    fs.load(subject, function (user, commit) {
      var setb = new SetAction({ id : 'b' });
      setb.do(subject);
      events.emit('action', 'uid', { id : 'a' }); // Injected remote event
      commit(setb);
    }, { get : { body : [] }, events : events });
  });
});
