var _ = require('lodash'),
    guid = require('../lib/guid'),
    assert = require('chai').assert,
    pass = require('pass-error');

/**
 * Tests & specifies Journal functionality.
 * @param {Function} newJournal creates a new Journal. Must have config snapshot frequency set to 0.
 */
module.exports = function (newJournal/*(server, app)*/) {
  var timestamp, journal;

  beforeEach(function () {
    timestamp = new Date().getTime();
    journal = newJournal(); // No server or app for now
  });

  it('should store some details', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.fetchDetails('a', pass(function (details) {
        assert.equal(details.name, 'A');
        done();
      }, done));
    }, done));
  });

  it('should store details by id', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function (a) {
      assert.equal(a.name, 'A');
      journal.putDetails('b', { name : 'B' }, pass(function (b) {
        assert.equal(b.name, 'B');
        journal.fetchDetails('a', pass(function (aDetails) {
          journal.fetchDetails('b', pass(function (bDetails) {
            assert.equal(aDetails.name, 'A');
            assert.equal(bDetails.name, 'B');
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });

  it('should store an event', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.addEvent('a', { id : '1' }, timestamp, pass(function () {
        journal.fetchEvents('a', pass(function (snapshot, events) {
          assert.isNull(snapshot);
          assert.isArray(events);
          assert.lengthOf(events, 1);
          assert.equal(events[0].id, '1');
          assert.equal(events[0].timestamp, timestamp);
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should store an array of events', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.addEvent('a', [{ id : '1' }, { id : '2' }], timestamp, pass(function () {
        journal.fetchEvents('a', pass(function (snapshot, events) {
          assert.isNull(snapshot);
          assert.isArray(events);
          assert.lengthOf(events, 2);
          assert.equal(events[0].id, '1');
          assert.equal(events[1].id, '2');
          assert.equal(events[0].timestamp, timestamp);
          assert.equal(events[1].timestamp, timestamp);
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should store two consecutive events', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.addEvent('a', { id : '1' }, timestamp, pass(function () {
        journal.addEvent('a', { id : '2' }, timestamp, pass(function () {
          journal.fetchEvents('a', pass(function (snapshot, events) {
            assert.isNull(snapshot);
            assert.isArray(events);
            assert.lengthOf(events, 2);
            assert.equal(events[0].id, '1');
            assert.equal(events[1].id, '2');
            assert.equal(events[0].timestamp, timestamp);
            assert.equal(events[1].timestamp, timestamp);
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });

  it('should accept a snapshot offer', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.offerSnapshot('a', timestamp, pass(function (nonce) {
        assert.isOk(nonce);
        done();
      }, done));
    }, done));
  });

  it('should store a snapshot', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.offerSnapshot('a', timestamp, pass(function (nonce) {
        journal.addSnapshot('a', nonce, {
          lastEventId : guid(), state : {}, timestamp : timestamp
        }, pass(function () {
          // Apparent success
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should reject a duff nonce', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.addSnapshot('a', guid(), {
        lastEventId : guid(), state : {}, timestamp : timestamp
      }, function (err) {
        assert.isOk(err);
        done();
      });
    }, done));
  });

  it('should reject another snapshot with the same timestamp', function (done) {
    journal.putDetails('a', { name : 'A' }, pass(function () {
      journal.offerSnapshot('a', timestamp, pass(function (nonce) {
        journal.addSnapshot('a', nonce, {
          lastEventId : guid(), state : {}, timestamp : timestamp
        }, pass(function () {
          journal.offerSnapshot('a', timestamp, pass(function (nonce) {
            assert.isUndefined(nonce);
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });
}
