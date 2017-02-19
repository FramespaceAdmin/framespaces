var _ = require('lodash'),
    itIsAJournal = require('./journalSpec'),
    TaffyJournal = require('../server/journal/taffy');

// Tests Taffy implementation of Journal functionality.
describe('Journal (taffy)', function () {
  afterEach(function () {
    TaffyJournal.journals = {};
  })

  itIsAJournal(TaffyJournal);
});
