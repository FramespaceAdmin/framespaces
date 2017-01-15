var MockPaper = require('./mockPaper'),
    MockIo = require('./mockIo'),
    MockTool = require('./mockTool'),
    MockUser = require('../client/user'),
    SetAction = require('./setAction'),
    EventEmitter = require('events'),
    guid = require('../lib/guid'),
    pass = require('pass-error'),
    assert = require('chai').assert,
    proxyquire = require('proxyquire').noCallThru(),
    fs = proxyquire('../client/fs', {
      './user/local' : MockUser,
      './user/remote' : MockUser,
      './action' : SetAction,
      'io' : MockIo
    });

var A_ID = guid(), B_ID = guid();

describe('Framespace client', function () {
  it('should report initialisation', function (done) {
    fs.load({}, function (user, commit) {
      assert.isObject(user);
      assert.isFunction(commit);
      done();
    }, { resources : { actions : [] } });
  });

  it('should publish a local action', function (done) {
    var events = new EventEmitter(), subject = {};
    events.on('action', function (userId, data) {
      assert.deepEqual(data, { id : A_ID, type : 'mutation' })
      done();
    });
    fs.load(subject, function (user, commit) {
      var seta = new SetAction({ id : A_ID });
      seta.do(subject);
      commit(seta);
    }, { resources : { actions : [] }, events : events });
  });

  it('should apply a remote action (before loaded)', function (done) {
    var subject = {};
    fs.load(subject, function (user, commit) {
      assert.isTrue(subject[A_ID]);
      done();
    }, { resources : { actions : [{ id : A_ID }] } });
  });

  it('should apply a remote action (during load)', function (done) {
    var events = new EventEmitter(), subject = {};
    fs.load(subject, function (user, commit) {
      assert.isTrue(subject[A_ID]);
      done();
    }, { resources : function (path, cb/*(err, body)*/) {
      events.emit('action', 'uid', { id : A_ID });
      setTimeout(function () { // Event is received async
        cb(false, []);
      }, 0);
    }, events : events });
  });

  it('should apply a remote action (after loaded)', function (done) {
    var events = new EventEmitter(), subject = {};
    fs.load(subject, function (user, commit) {
      events.emit('action', 'uid', { id : A_ID });
      setTimeout(function () { // Event is received async
        assert.isTrue(subject[A_ID]);
        done();
      }, 0);
    }, { resources : { actions : [] }, events : events });
  });

  it('should reset state if local actions not in channel order', function (done) {
    var events = new EventEmitter(), subject = {
      set : function (key) {
        if (key === A_ID) {
          assert.isTrue(!subject[B_ID], 'Action a should be applied first');
        } else if (key === B_ID && subject[A_ID]) {
          done();
        }
        subject[key] = true;
      }
    };
    fs.load(subject, function (user, commit) {
      var setb = new SetAction({ id : B_ID });
      setb.do(subject);
      events.emit('action', 'uid', { id : A_ID }); // Injected remote event
      commit(setb);
    }, { resources : { actions : [] }, events : events });
  });
});
