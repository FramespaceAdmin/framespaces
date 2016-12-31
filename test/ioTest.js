var _ = require('lodash'),
    MockIo = require('./mockIo'),
    EventEmitter = require('events'),
    pass = require('pass-error'),
    assert = require('chai').assert;

// This tests both base class and MockIo functionality.
// TODO: Refactor to support integration testing of other implementations.
describe('IO', function () {
  it('should derive its name', function () {
    assert.equal(new MockIo({ url : 'http://mock.io/fs' }).name, 'fs');
  });

  it('should report its url', function () {
    assert.equal(new MockIo({ url : 'http://mock.io/fs' }).url(), 'http://mock.io/fs');
  });

  it('should report its user', function () {
    assert.equal(new MockIo({ user : { id : 'uid' } }).user.id, 'uid');
  });

  it('should report its user has connected', function (done) {
    var io = new MockIo({ user : { id : 'uid' } });
    io.subscribe('user.connected', function (userId, user) {
      assert.equal(userId, 'uid');
      assert.isOk(user);
      done();
    });
  });

  it('should report an error when it is closed with one', function (done) {
    var io = new MockIo({ done : function (err) {
      assert.equal(err, 'Error!');
      done();
    } });
    io.close('Error!');
  });

  it('should report its user has disconnected when it is closed', function (done) {
    var io = new MockIo({ user : { id : 'uid' } });
    io.subscribe('user.disconnected', function (userId) {
      assert.equal(userId, 'uid');
      done();
    });
    io.close();
  });

  it('should construct derived urls', function () {
    assert.equal(new MockIo({ url : 'http://mock.io/fs' }).url('name'), 'http://mock.io/fs/name');
    assert.equal(new MockIo({ url : 'http://mock.io/fs' }).url('n1', 'n2'), 'http://mock.io/fs/n1/n2');
  });

  it('should GET a resource (Mock)', function (done) {
    io = new MockIo({ done : done });
    io.get.body = 'hello';
    io.get('name', pass(function (body) {
      assert.equal(body, 'hello');
      done();
    }, done));
  });

  it('should not allow the client to publish user events', function (done) {
    var io = new MockIo({ user : { id : 'uid' } });
    io.subscribe('user.disconnected', function (userId) {
      assert.equal(userId, 'uid');
      done();
    });
    io.publish('user.disconnected', { id : 'bogus' });
    io.close(); // To ensure the test completes
  });

  it('should report local subscribers', function () {
    var io = new MockIo(), subscriber = _.noop;
    io.subscribe('action', subscriber);
    assert.deepEqual(io.subscribers('action'), [subscriber]);
  });

  it('should not report remote subscribers', function () {
    var events = new EventEmitter(), io = new MockIo({ events : events });
    events.on('action', _.noop);
    assert.deepEqual(io.subscribers('action'), []);
  });

  it('should report a successful publish', function (done) {
    new MockIo().publish('action', 'act', done);
  });

  it('should report an unsuccessful publish', function (done) {
    var io = new MockIo();
    io.publish.error = 'Error!';
    io.publish('action', 'act', function (err) {
      assert.equal(err, 'Error!');
      done();
    });
  });

  it('should echo action events', function (done) {
    var io = new MockIo({ user : { id : 'uid' } });
    io.subscribe('action', function (userId, action) {
      assert.equal(userId, 'uid');
      assert.equal(action, 'act');
      done();
    });
    io.publish('action', 'act');
  });

  it('should not echo interaction events', function (done) {
    var io = new MockIo({ user : { id : 'uid' }, done : done });
    io.subscribe('interactions', function () {
      done('Interactions echoed!');
    });
    io.publish('interactions', ['1', '2']);
    io.close();
  });

  it('should report remote user events', function (done) {
    var events = new EventEmitter(), io = new MockIo({ events : events });
    io.subscribe('user.disconnected', function (userId) {
      assert.equal(userId, 'uid');
      done();
    });
    events.emit('user.disconnected', 'uid', 'act');
  });

  it('should report remote action events', function (done) {
    var events = new EventEmitter(), io = new MockIo({ events : events });
    io.subscribe('action', function (userId, action) {
      assert.equal(userId, 'uid');
      assert.equal(action, 'act');
      done();
    });
    events.emit('action', 'uid', 'act');
  });

  it('should report remote interaction events', function (done) {
    var events = new EventEmitter(), io = new MockIo({ events : events });
    io.subscribe('interactions', function (userId, interactions) {
      assert.equal(userId, 'uid');
      assert.deepEqual(interactions, ['1', '2']);
      done();
    });
    events.emit('interactions', 'uid', ['1', '2']);
  });

  it('should emit (report locally) action events', function (done) {
    var io = new MockIo();
    io.subscribe('action', function (userId, action) {
      assert.equal(userId, 'uid');
      assert.equal(action, 'act');
      done();
    });
    io.emit('action', ['uid', 'act']);
  });

  it('should be able to pause remote messages', function (done) {
    var events = new EventEmitter(), io = new MockIo({ events : events }),
        paused = true;
    io.subscribe('action', function (userId, action) {
      if (paused) {
        done('Event reveived while paused!');
      } else {
        assert.equal(action, 'act');
        done();
      }
    });
    io.pause('action', pass(function (play) {
      events.emit('action', 'uid', 'act');
      // Push the play to after the next tick so that the event is processed
      setTimeout(function () {
        paused = false;
        play();
      }, 0);
    }, done));
  });

  it('should be able to play additional messages', function (done) {
    var events = new EventEmitter(), io = new MockIo({ events : events }),
        paused = true, act1Received = false;
    io.subscribe('action', function (userId, action) {
      if (paused) {
        done('Event reveived while paused!');
      } else if (!act1Received) {
        assert.equal(action, 'act1');
        act1Received = true;
      } else {
        assert.equal(action, 'act2');
        done();
      }
    });
    io.pause('action', pass(function (play) {
      events.emit('action', 'uid', 'act2');
      // Push the play to after the next tick so that the event is processed
      setTimeout(function () {
        paused = false;
        play([['uid', 'act1']], '1');
      }, 0);
    }, done));
  });
});
