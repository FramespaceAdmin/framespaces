var _ = require('lodash'),
    EventEmitter = require('events'),
    pass = require('pass-error'),
    assert = require('chai').assert,
    guid = require('../lib/guid');

var OPTIONS = {
  url : String, // Base URL for the IO
  user : { id : String }, // User with identity
  events : EventEmitter, // An event emitter which simulates a remote connection
  get : { undefined : String } // Forced get result
};

var TEST_ACTION = {
  id : guid(),
  type : 'addition'
};

var DEFAULT_URL = 'http://localhost:3001/fs';

module.exports = function (newIo/*(options, cb(err, io))*/) {
  it('should derive its name', function (done) {
    newIo.call(this, { url : DEFAULT_URL }, pass(function (io) {
      assert.equal(io.name, 'fs');
      io.close();
      done();
    }, done));
  });

  it('should report its url', function (done) {
    newIo.call(this, { url : DEFAULT_URL }, pass(function (io) {
      assert.equal(io.url(), DEFAULT_URL);
      io.close();
      done();
    }, done));
  });

  it('should report its user', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      assert.equal(io.user.id, 'uid');
      io.close();
      done();
    }, done));
  });

  it('should report its user has connected', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      io.subscribe('user.connected', function (userId, user) {
        assert.equal(userId, 'uid');
        assert.isOk(user);
        io.close();
        done();
      });
    }, done));
  });

  it('should report a disconnect error when it is closed with one', function (done) {
    newIo.call(this, {}, pass(function (io) {
      io.subscribe('user.disconnected', function (userId, err) {
        assert.equal(err, 'Error!');
        done();
      });
      io.close('Error!');
    }, done));
  });

  it('should report its user has disconnected when it is closed', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      io.subscribe('user.disconnected', function (userId) {
        assert.equal(userId, 'uid');
        done();
      });
      io.close();
    }, done));
  });

  it('should construct derived urls', function (done) {
    newIo.call(this, { url : DEFAULT_URL }, pass(function (io) {
      assert.equal(io.url('name'), 'http://localhost:3001/fs/name');
      assert.equal(io.url('n1', 'n2'), 'http://localhost:3001/fs/n1/n2');
      io.close();
      done();
    }, done));
  });

  it('should GET a resource', function (done) {
    newIo.call(this, { get : { resource : 'hello' } }, pass(function (io) {
      io.get('resource', pass(function (body) {
        assert.equal(body, 'hello');
        io.close();
        done();
      }, done));
    }, done));
  });

  it('should not allow the client to publish user events', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      io.subscribe('user.disconnected', function (userId) {
        assert.equal(userId, 'uid');
        done();
      });
      io.publish('user.disconnected', { id : 'bogus' });
      io.close();
    }, done));
  });

  it('should report local subscribers', function (done) {
    newIo.call(this, {}, pass(function (io) {
      var subscriber = _.noop;
      io.subscribe('action', subscriber);
      assert.deepEqual(io.subscribers('action'), [subscriber]);
      io.close();
      done();
    }, done));
  });

  it('should not report remote subscribers', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      events.on('action', _.noop);
      assert.deepEqual(io.subscribers('action'), []);
      io.close();
      done();
    }, done));
  });

  it('should report a successful publish', function (done) {
    newIo.call(this, {}, pass(function (io) {
      // Note you have to be connected to publish
      io.subscribe('user.connected', function () {
        io.publish('action', TEST_ACTION, function (err) {
          io.close();
          done(err);
        });
      });
    }, done));
  });

  it('should report an invalid publish', function (done) {
    newIo.call(this, {}, pass(function (io) {
      io.subscribe('user.connected', function () {
        io.publish('action', 'garbage', function (err) {
          assert.isOk(err);
          io.close();
          done();
        });
      });
    }, done));
  });

  it('should echo action events', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        io.close();
        done();
      });
      io.subscribe('user.connected', function () {
        io.publish('action', TEST_ACTION);
      });
    }, done));
  });

  it('should not echo interaction events', function (done) {
    newIo.call(this, { user : { id : 'uid' } }, pass(function (io) {
      io.subscribe('user.disconnected', function () {
        done();
      });
      io.subscribe('interactions', function () {
        done('Interactions echoed!');
      });
      io.subscribe('user.connected', function () {
        io.publish('interactions', ['1', '2']);
        io.close();
      });
    }, done));
  });

  it('should report remote user events', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      io.subscribe('user.disconnected', function (userId) {
        if (userId === 'uid') {
          done();
          io.close();
        }
      });
      io.subscribe('user.connected', function () {
        events.emit('user.disconnected', 'uid');
      });
    }, done));
  });

  it('should report remote action events', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        done();
        io.close();
      });
      io.subscribe('user.connected', function () {
        events.emit('action', 'uid', TEST_ACTION);
      });
    }, done));
  });

  it('should report remote interaction events', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      io.subscribe('interactions', function (userId, interactions) {
        assert.equal(userId, 'uid');
        assert.deepEqual(interactions, ['1', '2']);
        done();
        io.close();
      });
      io.subscribe('user.connected', function () {
        events.emit('interactions', 'uid', ['1', '2']);
      });
    }, done));
  });

  it('should emit (report locally) action events', function (done) {
    newIo.call(this, {}, pass(function (io) {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        done();
        io.close();
      });
      io.subscribe('user.connected', function () {
        io.emit('action', ['uid', TEST_ACTION]);
      });
    }, done));
  });

  it('should be able to pause remote messages', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      var paused = true;
      io.subscribe('action', function (userId, action) {
        assert.isFalse(paused, 'Event received while paused!');
        assert.deepEqual(action, TEST_ACTION);
        done();
        io.close();
      });
      io.subscribe('user.connected', function () {
        io.pause('action', pass(function (play) {
          events.emit('action', 'uid', TEST_ACTION);
          // Push the play to after the next tick so that the event is processed
          setTimeout(function () {
            paused = false;
            play();
          }, 0);
        }, done));
      });
    }, done));
  });

  it('should be able to play additional messages', function (done) {
    var events = new EventEmitter();
    newIo.call(this, { events : events }, pass(function (io) {
      var paused = true, act1Received = false;
      io.subscribe('action', function (userId, action) {
        assert.isFalse(paused, 'Event received while paused!');
        if (!act1Received) {
          assert.equal(action, 'act1');
          act1Received = true;
        } else {
          assert.equal(action, 'act2');
          done();
          io.close();
        }
      });
      io.subscribe('user.connected', function () {
        io.pause('action', pass(function (play) {
          events.emit('action', 'uid', 'act2');
          // Push the play to after the next tick so that the event is processed
          setTimeout(function () {
            paused = false;
            play([['uid', 'act1']], '1');
          }, 0);
        }, done));
      });
    }, done));
  });
};

module.exports.OPTIONS = OPTIONS;
module.exports.DEFAULT_URL = DEFAULT_URL;
