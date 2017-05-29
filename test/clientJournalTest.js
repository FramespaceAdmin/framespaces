var _ = require('lodash'),
    _async = require('async'),
    _events = require('../lib/events'),
    assert = require('chai').assert,
    pass = require('pass-error'),
    proxyquire = require('proxyquire').noCallThru(),
    nock = require('nock'),
    Storage = require('dom-storage'),
    browser = {
      localStorage : new Storage(null, { strict: true }),
      url : function () { return _.concat(['http://localhost'], arguments).join('/'); }
    },
    config = _({ // Settable config
      snapshotFrequency : 10
    }),
    Journal = proxyquire('../client/journal', {
      '../browser' : browser,
      'config' : config
    }),
    requires = {
      '../browser' : browser,
      '../journal' : Journal
    },
    MemoryJournal = proxyquire('../client/journal/memory', requires),
    LocalJournal = proxyquire('../client/journal/local', requires),
    RemoteJournal = proxyquire('../client/journal/remote', requires);

function itIsJournal(Journal) {
  var journal, subject, timestamp;

  beforeEach(function () {
    journal = new Journal('ns');
    subject = { getState : _.constant('snapshot') };
    timestamp = new Date().getTime();
  });

  it('should initialise to an empty array', function (done) {
    journal.fetchEvents(pass(function (snapshot, events) {
      assert.deepEqual(events, []);
      done();
    }, done));
  });

  it('should store an event', function (done) {
    journal.addEvent(subject, { a : 1 }, timestamp, pass(function (n) {
      assert.equal(n, 1);
      done();
    }, done));
  });

  it('should report an event', function (done) {
    journal.addEvent(subject, { a : 1 }, timestamp, pass(function () {
      journal.fetchEvents(pass(function (snapshot, events) {
        assert.deepEqual(events, [{ a : 1, timestamp : timestamp }]);
        done();
      }, done));
    }, done));
  });

  it('should store events in order', function (done) {
    journal.addEvent(subject, { a : 1 }, timestamp, pass(function () {
      journal.addEvent(subject, { a : 2 }, timestamp, pass(function () {
        journal.fetchEvents(pass(function (snapshot, events) {
          assert.deepEqual(events, [{ a : 1, timestamp : timestamp }, { a : 2, timestamp, timestamp }]);
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should store an array of events', function (done) {
    journal.addEvent(subject, [{ a : 1 }, { a : 2 }], timestamp, pass(function () {
      journal.fetchEvents(pass(function (snapshot, events) {
        assert.deepEqual(events, [{ a : 1, timestamp : timestamp }, { a : 2, timestamp, timestamp }]);
        done();
      }, done));
    }, done));
  });

  it('should take a snapshot after enough events', function (done) {
    _async.timesSeries(10, function (n, cb) {
      journal.addEvent(subject, { a : 1 }, timestamp, cb);
    }, pass(function () {
        journal.fetchEvents(pass(function (snapshot, events) {
          assert.deepEqual(events, []);
          assert.deepEqual(snapshot, { state : 'snapshot', timestamp : timestamp });
          done();
        }, done));
    }, done));
  });

  it('should report events after a snapshot', function (done) {
    _async.timesSeries(10, function (n, cb) {
      journal.addEvent(subject, { a : 1 }, timestamp, cb);
    }, pass(function () {
      journal.addEvent(subject, { a : 2 }, timestamp, pass(function () {
        journal.fetchEvents(pass(function (snapshot, events) {
          assert.deepEqual(snapshot, { state : 'snapshot', timestamp : timestamp });
          assert.deepEqual(events, [{ a : 2, timestamp : timestamp }]);
          done();
        }, done));
      }, done));
    }, done));
  });
}

describe('Client journal selection', function () {
  var localStorage = browser.localStorage;
  it('selects a remote journal unless local is asked for', function () {
    assert.instanceOf(Journal(), RemoteJournal);
  });
  it('selects a local journal if local is asked for', function () {
    config.set('modules.io', 'local').value();
    assert.instanceOf(Journal(), LocalJournal);
  });
  it('selects a memory journal if not local storage available', function () {
    config.set('modules.io', 'local').value();
    delete browser.localStorage;
    assert.instanceOf(Journal(), MemoryJournal);
  });
  afterEach(function () {
    _.unset(config.value(), 'modules.io');
    browser.localStorage = localStorage;
  });
});

describe('Client memory journal', function () {
  itIsJournal(MemoryJournal);
});

describe('Client local journal', function () {
  beforeEach(function () {
    browser.localStorage.clear();
  });
  itIsJournal(LocalJournal);
});

describe('Client remote journal', function () {
  var events, snapshot;
  beforeEach(function () {
    events = [];
    nock('http://localhost').get('/ns/events').twice().reply(200, function () {
      return { snapshot : snapshot, events : events };
    });
    nock('http://localhost').post('/ns/snapshot', function (body) {
      return body.state && body.timestamp && (events = []) && !!(snapshot = body);
    }).reply(202);
  });
  // Simulate the adding of events to the remote journal
  var nativeAddEvent = RemoteJournal.prototype.addEvent;
  RemoteJournal.prototype.addEvent = function (subject, data, timestamp, cb) {
    events.push.apply(events, _events.from(data, timestamp));
    return nativeAddEvent.call(this, subject, data, timestamp, cb);
  };
  itIsJournal(RemoteJournal);
});
