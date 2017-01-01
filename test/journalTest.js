var _ = require('lodash'),
    assert = require('chai').assert,
    pass = require('pass-error'),
    TaffyJournal = require('../server/journal/taffy');

// Tests & specifies Journal functionality via Taffy implementation.
// TODO: Make this support integration tests of other journals.
describe('Journal (taffy)', function () {
  // Taffy journal is in-memory, so must be reset after every test
  afterEach(TaffyJournal.reset);

  it('should store some details', function (done) {
    TaffyJournal('a').putDetails({ name : 'A' }, pass(function () {
      TaffyJournal('a').fetchDetails(pass(function (details) {
        assert.equal(details.name, 'A');
        done();
      }, done));
    }, done));
  });

  it('should store details by id', function (done) {
    TaffyJournal('a').putDetails({ name : 'A' }, pass(function () {
      TaffyJournal('b').putDetails({ name : 'B' }, pass(function () {
        TaffyJournal('a').fetchDetails(pass(function (aDetails) {
          TaffyJournal('b').fetchDetails(pass(function (bDetails) {
            assert.equal(aDetails.name, 'A');
            assert.equal(bDetails.name, 'B');
            done();
          }, done));
        }, done));
      }, done));
    }, done));
  });

  it('should store an event', function (done) {
    TaffyJournal('a').addEvent({ id : '1' }, pass(function () {
      TaffyJournal('a').fetchEvents(pass(function (events) {
        assert.isArray(events);
        assert.lengthOf(events, 1);
        assert.equal(events[0].id, '1');
        done();
      }, done));
    }, done));
  });

  it('should store an array of events', function (done) {
    TaffyJournal('a').addEvent([{ id : '1' }, { id : '2' }], pass(function () {
      TaffyJournal('a').fetchEvents(pass(function (events) {
        assert.isArray(events);
        assert.lengthOf(events, 2);
        assert.equal(events[0].id, '1');
        assert.equal(events[1].id, '2');
        done();
      }, done));
    }, done));
  });

  it('should store two consecutive events', function (done) {
    TaffyJournal('a').addEvent({ id : '1' }, pass(function () {
      TaffyJournal('a').addEvent({ id : '2' }, pass(function () {
        TaffyJournal('a').fetchEvents(pass(function (events) {
          assert.isArray(events);
          assert.lengthOf(events, 2);
          assert.equal(events[0].id, '1');
          assert.equal(events[1].id, '2');
          done();
        }, done));
      }, done));
    }, done));
  });
});
