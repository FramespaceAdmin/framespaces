require('jsdom-global')();

var assert = require('chai').assert,
    Storage = require('dom-storage'),
    Journal = require('../client/journal'),
    LocalJournal = require('../client/journal/local');

function itIsJournal(newJournal) {
  it('should initialise to an empty array', function () {
    assert.deepEqual(newJournal().fetchEvents('ns'), []);
  });

  it('should store an event', function () {
    assert.equal(newJournal().addEvent('ns', {}), 1);
  });

  it('should report an event', function () {
    var journal = newJournal();
    journal.addEvent('ns', {});
    assert.deepEqual(journal.fetchEvents('ns'), [{}]);
  });

  it('should store events in order', function () {
    var journal = newJournal();
    journal.addEvent('ns', { a : 1 });
    journal.addEvent('ns', { a : 2 });
    assert.deepEqual(journal.fetchEvents('ns'), [{ a : 1 }, { a : 2 }]);
  });
}

describe('Client memory journal', function () {
  itIsJournal(Journal);
});

describe('Client local journal', function () {
  beforeEach(function () {
    window.localStorage = new Storage(null, { strict: true });
    global.localStorage = window.localStorage;
  });

  it('should detect local storage', function () {
    assert.instanceOf(Journal(), LocalJournal);
  });

  itIsJournal(Journal);

  afterEach(function () {
    delete window.localStorage;
    delete global.localStorage;
  });
});
