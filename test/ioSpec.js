var _ = require('lodash'),
    EventEmitter = require('events'),
    pass = require('pass-error'),
    assert = require('chai').assert,
    guid = require('../lib/guid');

var OPTIONS = {
  url : String, // Base URL for the IO
  user : { id : String }, // User with identity
  events : EventEmitter, // An event emitter which simulates a remote connection
  resources : { undefined : Object } // Forced get result
};

var TEST_ACTION = {
  id : guid(),
  type : 'addition'
};

var DEFAULT_URL = 'http://localhost:3001/fs';

module.exports = function (newIo/*(options, cb(err, io))*/) {
  var io;

  function setupIo(options, test, done) {
    newIo.call(this, options, pass(function (nio) {
      io = nio;
      test.call(this);
    }, done, null, this));
  }

  afterEach(function (done) {
    io ? io.close(null, done) : done();
  });

  it('should derive its name', function (done) {
    setupIo.call(this, { url : DEFAULT_URL }, function () {
      assert.equal(io.name, 'fs');
      done();
    }, done);
  });

  it('should report its url', function (done) {
    setupIo.call(this, { url : DEFAULT_URL }, function () {
      assert.equal(io.url(), DEFAULT_URL);
      done();
    }, done);
  });

  it('should report its user', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      assert.equal(io.user.id, 'uid');
      done();
    }, done);
  });

  it('should report its user has connected', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      io.subscribe('user.connected', function (userId, user) {
        assert.equal(userId, 'uid');
        assert.isOk(user);
        done();
      });
    }, done);
  });

  it('should report a disconnect error when it is closed with one', function (done) {
    setupIo.call(this, {}, function () {
      var disconnected = false;
      io.subscribe('user.disconnected', function (userId, err) {
        assert.equal(err, 'Error!');
        disconnected = true;
      });
      io.close('Error!', pass(function () {
        io = null; // Prevent it being closed by afterEach
        done();
      }, done)); // done should not be passed the error
    }, done);
  });

  it('should report its user has disconnected when it is closed', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      var disconnected = false;
      io.subscribe('user.disconnected', function (userId) {
        assert.equal(userId, 'uid');
        disconnected = true;
      });
      io.close(null, pass(function () {
        assert.isTrue(disconnected);
        io = null;
        done();
      }, done));
    }, done);
  });

  it('should construct derived urls', function (done) {
    setupIo.call(this, { url : DEFAULT_URL }, function () {
      assert.equal(io.url('name'), 'http://localhost:3001/fs/name');
      assert.equal(io.url('n1', 'n2'), 'http://localhost:3001/fs/n1/n2');
      done();
    }, done);
  });

  it('should GET a resource', function (done) {
    setupIo.call(this, { resources : { resource : 'hello' } }, function () {
      io.get('resource', pass(function (body) {
        assert.equal(body, 'hello');
        done();
      }, done));
    }, done);
  });

  it('should not allow the client to publish user events', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      io.subscribe('user.disconnected', function (userId) {
        assert.notEqual(userId, 'bogus');
      });
      io.subscribe('user.connected', function (userId, user) {
        io.publish('user.disconnected', { id : 'bogus' });
        done();
      });
    }, done);
  });

  it('should report local subscribers', function (done) {
    setupIo.call(this, {}, function () {
      var subscriber = _.noop;
      io.subscribe('action', subscriber);
      assert.deepEqual(io.subscribers('action'), [subscriber]);
      done();
    }, done);
  });

  it('should not report remote subscribers', function (done) {
    var events = new EventEmitter();
    setupIo.call(this, { events : events }, function () {
      events.on('action', _.noop);
      assert.deepEqual(io.subscribers('action'), []);
      done();
    }, done);
  });

  it('should report a successful publish', function (done) {
    setupIo.call(this, {}, function () {
      // Note you have to be connected to publish
      io.subscribe('user.connected', function () {
        io.publish('action', TEST_ACTION, done);
      });
    }, done);
  });

  it('should echo action events', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        done();
      });
      io.subscribe('user.connected', function () {
        io.publish('action', TEST_ACTION);
      });
    }, done);
  });

  it('should not echo interaction events', function (done) {
    setupIo.call(this, { user : { id : 'uid' } }, function () {
      io.subscribe('interactions', function () {
        done('Interactions echoed!');
      });
      io.subscribe('user.connected', function () {
        io.publish('interactions', ['1', '2']);
        done();
      });
    }, done);
  });

  it('should report remote user events', function (done) {
    var events = new EventEmitter();
    setupIo.call(this, { events : events }, function () {
      io.subscribe('user.disconnected', function (userId) {
        if (userId === 'uid') {
          done();
        }
      });
      io.subscribe('user.connected', function (userId) {
        if (userId !== 'uid') {
          events.emit('user.connected', 'uid', { id : 'uid' });
          events.emit('user.disconnected', 'uid');
        }
      });
    }, done);
  });

  it('should report remote action events', function (done) {
    var events = new EventEmitter();
    setupIo.call(this, { events : events }, function () {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        done();
      });
      io.subscribe('user.connected', function () {
        events.emit('action', 'uid', TEST_ACTION);
      });
    }, done);
  });

  it('should report remote interaction events', function (done) {
    var events = new EventEmitter();
    setupIo.call(this, { events : events }, function () {
      io.subscribe('interactions', function (userId, interactions) {
        assert.equal(userId, 'uid');
        assert.deepEqual(interactions, ['1', '2']);
        done();
      });
      io.subscribe('user.connected', function () {
        events.emit('interactions', 'uid', ['1', '2']);
      });
    }, done);
  });

  it('should emit (report locally) action events', function (done) {
    setupIo.call(this, {}, function () {
      io.subscribe('action', function (userId, action) {
        assert.equal(userId, 'uid');
        assert.deepEqual(action, TEST_ACTION);
        done();
      });
      io.subscribe('user.connected', function () {
        io.emit('action', ['uid', TEST_ACTION]);
      });
    }, done);
  });

  it('should be able to pause remote messages', function (done) {
    var events = new EventEmitter();
    setupIo.call(this, { events : events }, function () {
      io.subscribe('user.connected', function () {
        io.pause('action', pass(function (play) {
          events.emit('action', 'uid', TEST_ACTION);
          // Push the play out for a reasonable time so that the event is processed
          setTimeout(function () {
            assert.deepEqual(play(), [['uid', TEST_ACTION]]);
            done();
          }, 10);
        }, done));
      });
    }, done);
  });
};

module.exports.OPTIONS = OPTIONS;
module.exports.DEFAULT_URL = DEFAULT_URL;
