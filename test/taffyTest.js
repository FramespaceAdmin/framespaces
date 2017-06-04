var _ = require('lodash'),
    itIsAJournal = require('./journalSpec'),
    proxyquire = require('proxyquire'),
    TaffyJournal = proxyquire('../server/journal/taffy', {
      'config' : _({ snapshotFrequency : 0 })
    });

// Tests Taffy implementation of Journal functionality.
describe('Journal (taffy)', function () {
  afterEach(function () {
    TaffyJournal.journals = {};
  })

  itIsAJournal(TaffyJournal);
});
