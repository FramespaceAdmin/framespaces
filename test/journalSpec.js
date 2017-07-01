var _ = require('lodash'),
    guid = require('../lib/guid'),
    assert = require('chai').assert,
    pass = require('pass-error');

/**
 * Tests & specifies Journal functionality.
 * @param {Function} newJournal creates a new Journal. Must have config snapshot frequency set to 0.
 */
module.exports = function (newJournal/*(name)*/) {
  var timestamp;

  beforeEach(function () {
    timestamp = new Date().getTime();
  });

  it('should store some details', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').fetchDetails(pass(function (details) {
        assert.equal(details.name, 'A');
        done();
      }, done));
    }, done));
  });

  it('should store details by id', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function (a) {
      assert.equal(a.name, 'A');
      newJournal('b').putDetails({ name : 'B' }, pass(function (b) {
        assert.equal(b.name, 'B');
        newJournal('a').fetchDetails(pass(function (aDetails) {
          newJournal('b').fetchDetails(pass(function (bDetails) {
            assert.equal(aDetails.name, 'A');
            assert.equal(bDetails.name, 'B');
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });

  it('should store an event', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addEvent({ id : '1' }, timestamp, pass(function () {
        newJournal('a').fetchEvents(pass(function (snapshot, events) {
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
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addEvent([{ id : '1' }, { id : '2' }], timestamp, pass(function () {
        newJournal('a').fetchEvents(pass(function (snapshot, events) {
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
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addEvent({ id : '1' }, timestamp, pass(function () {
        newJournal('a').addEvent({ id : '2' }, timestamp, pass(function () {
          newJournal('a').fetchEvents(pass(function (snapshot, events) {
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
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').offerSnapshot(timestamp, pass(function (nonce) {
        assert.isOk(nonce);
        done();
      }, done));
    }, done));
  });

  it('should store a snapshot', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').offerSnapshot(timestamp, pass(function (nonce) {
        newJournal('a').addSnapshot(nonce, {
          lastEventId : guid(), state : {}, timestamp : timestamp
        }, pass(function () {
          // Apparent success
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should reject a duff nonce', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addSnapshot(guid(), {
        lastEventId : guid(), state : {}, timestamp : timestamp
      }, function (err) {
        assert.isOk(err);
        done();
      });
    }, done));
  });

  it('should reject another snapshot with the same timestamp', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').offerSnapshot(timestamp, pass(function (nonce) {
        newJournal('a').addSnapshot(nonce, {
          lastEventId : guid(), state : {}, timestamp : timestamp
        }, pass(function () {
          newJournal('a').offerSnapshot(timestamp, pass(function (nonce) {
            assert.isUndefined(nonce);
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });
}
