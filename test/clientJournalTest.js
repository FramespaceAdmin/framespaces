require('jsdom-global')();

var assert = require('chai').assert,
    pass = require('pass-error'),
    Storage = require('dom-storage'),
    MemoryJournal = require('../client/journal/memory'),
    LocalJournal = require('../client/journal/local');

function itIsJournal(Journal) {
  var subject, timestamp;

  beforeEach(function () {
    subject = {};
    timestamp = new Date().getTime();
  });

  it('should initialise to an empty array', function (done) {
    new Journal('ns').fetchEvents(pass(function (snapshot, events) {
      assert.deepEqual(events, []);
      done();
    }, done));
  });

  it('should store an event', function (done) {
    new Journal('ns').addEvent(subject, {}, timestamp, pass(function (n) {
      assert.equal(n, 1);
      done();
    }, done));
  });

  it('should report an event', function (done) {
    var journal = new Journal('ns');
    journal.addEvent(subject, {}, timestamp, pass(function () {
      journal.fetchEvents(pass(function (snapshot, events) {
        assert.deepEqual(events, [{ timestamp : timestamp }]);
        done();
      }, done));
    }, done));
  });

  it('should store events in order', function (done) {
    var journal = new Journal('ns');
    journal.addEvent(subject, { a : 1 }, timestamp, pass(function () {
      journal.addEvent(subject, { a : 2 }, timestamp, pass(function () {
        journal.fetchEvents(pass(function (snapshot, events) {
          assert.deepEqual(events, [{ a : 1, timestamp : timestamp }, { a : 2, timestamp, timestamp }]);
          done();
        }, done));
      }, done));
    }, done));
  });
}

describe('Client memory journal', function () {
  itIsJournal(MemoryJournal);
});

describe('Client local journal', function () {
  beforeEach(function () {
    window.localStorage = new Storage(null, { strict: true });
    global.localStorage = window.localStorage;
  });

  itIsJournal(LocalJournal);

  afterEach(function () {
    delete window.localStorage;
    delete global.localStorage;
  });
});
