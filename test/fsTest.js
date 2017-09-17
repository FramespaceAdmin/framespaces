var _ = require('lodash'),
    MockPaper = require('./mockPaper'),
    MockIo = require('./mockIo'),
    MockTool = require('./mockTool'),
    MockUser = require('../client/user'),
    MemoryJournal = require('../client/journal/memory'),
    SetAction = require('./setAction'),
    EventEmitter = require('events'),
    guid = require('../lib/guid'),
    pass = require('pass-error'),
    assert = require('chai').assert,
    proxyquire = require('proxyquire').noCallThru(),
    fs = proxyquire('../client/fs', {
      './user/local' : MockUser,
      './user/remote' : MockUser,
      './action' : SetAction
    });

var A_ID = guid(), B_ID = guid();
function MockSubject() {};
MockSubject.prototype.changed = _.noop;
MockSubject.prototype.setState = _.noop;
MockSubject.prototype.getState = _.constant(null);

describe('Framespace client', function () {
  var subject;

  beforeEach(function () {
    subject = new MockSubject();
  });

  it('should report initialisation', function (done) {
    fs.load(subject, new MockIo('fs'), new MemoryJournal('fs'), function (user, commit) {
      assert.isObject(user);
      assert.isFunction(commit);
      done();
    });
  });

  it('should publish a local action', function (done) {
    var emitter = new EventEmitter();
    emitter.on('action', function (userId, data) {
      assert.deepEqual(data, { id : A_ID, type : 'mutation' })
      done();
    });
    fs.load(subject, new MockIo('fs', { events : emitter }), new MemoryJournal('fs'), function (user, commit) {
      var seta = new SetAction({ id : A_ID });
      seta.do(subject);
      commit(seta);
    });
  });

  it('should apply a remote action received during load', function (done) {
    var emitter = new EventEmitter();
    var journal = new MemoryJournal('fs');
    journal.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
      emitter.emit('action', 'uid', { id: A_ID }); // Send the action while events are being fetched
      setTimeout(function () { // Wait 10ms for the event to be async received
        cb(false, null, []); // No fetched snapshot or events
      }, 10);
    };
    fs.load(subject, new MockIo('fs', { events: emitter }), journal, function connected(user, commit) {
      assert.isTrue(subject[A_ID]);
      done();
    });
  });

  it('should not re-apply an action received during load', function (done) {
    var emitter = new EventEmitter();
    var journal = new MemoryJournal('fs')
    journal.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
      emitter.emit('action', 'uid', { id: A_ID }); // Send the action while events are being fetched
      setTimeout(function () { // Wait 10ms for the event to be async received
        cb(false, null, [{ id: A_ID }]); // Emitted event is also fetched
      }, 10);
    };
    subject.set = function expectA(key) {
      assert.equal(key, A_ID);
      assert.isNotOk(subject[A_ID]); // Only set once
      subject[key] = true;
    };
    fs.load(subject, new MockIo('fs', { events: emitter }), journal, function connected(user, commit) {
      assert.isTrue(subject[A_ID]);
      done();
    });
  });

  it('should apply a remote action after loaded', function (done) {
    var emitter = new EventEmitter();
    fs.load(subject, new MockIo('fs', { events : emitter }), new MemoryJournal('fs'), function connected(user, commit) {
      emitter.emit('action', 'uid', { id : A_ID });
      setTimeout(function () { // Event is received async
        assert.isTrue(subject[A_ID]);
        done();
      }, 10);
    });
  });

  it('should reset state if local actions not in channel order', function (done) {
    var emitter = new EventEmitter();
    subject.set = function expectAThenB(key) {
      if (key === A_ID) {
        assert.isTrue(!subject[B_ID], 'Action a should be applied first');
      } else if (key === B_ID && subject[A_ID]) {
        done();
      }
      subject[key] = true;
    };
    fs.load(subject, new MockIo('fs', { events : emitter }), new MemoryJournal('fs'), function connected(user, commit) {
      var setb = new SetAction({ id : B_ID });
      setb.do(subject);
      emitter.emit('action', 'uid', { id : A_ID }); // Injected remote event
      commit(setb);
    });
  });
});
