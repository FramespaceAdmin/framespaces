var _ = require('lodash'),
    assert = require('chai').assert,
    pass = require('pass-error');

// Tests & specifies Journal functionality
module.exports = function (newJournal) {
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
      newJournal('a').addEvent({ id : '1' }, pass(function () {
        newJournal('a').fetchEvents(pass(function (events) {
          assert.isArray(events);
          assert.lengthOf(events, 1);
          assert.equal(events[0].id, '1');
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should store an array of events', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addEvent([{ id : '1' }, { id : '2' }], pass(function () {
        newJournal('a').fetchEvents(pass(function (events) {
          assert.isArray(events);
          assert.lengthOf(events, 2);
          assert.equal(events[0].id, '1');
          assert.equal(events[1].id, '2');
          done();
        }, done));
      }, done));
    }, done));
  });

  it('should store two consecutive events', function (done) {
    newJournal('a').putDetails({ name : 'A' }, pass(function () {
      newJournal('a').addEvent({ id : '1' }, pass(function () {
        newJournal('a').addEvent({ id : '2' }, pass(function () {
          newJournal('a').fetchEvents(pass(function (events) {
            assert.isArray(events);
            assert.lengthOf(events, 2);
            assert.equal(events[0].id, '1');
            assert.equal(events[1].id, '2');
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });
}
