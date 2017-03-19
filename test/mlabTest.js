var _ = require('lodash'),
    pass = require('pass-error'),
    itIsAJournal = require('./journalSpec'),
    proxyquire = require('proxyquire').noCallThru(),
    mongoMock = require('mongo-mock'),
    MLabJournal = proxyquire('../server/journal/mlab', {
      'mongodb' : mongoMock
    });

mongoMock.max_delay = 0;

// Tests Taffy implementation of Journal functionality.
describe('Journal (mlab)', function () {
  before(function () {
    process.env.FS_MLAB_DEV_URL = 'mock';
  });

  afterEach(function (done) {
    MLabJournal.journals.remove();
    MLabJournal.events.remove();
    MLabJournal.close(done);
  });

  itIsAJournal(function (id) {
    // Mock Mongo can't cope with findAndModify, so mock it with an update
    // TODO: Be a good citizen and pull request
    return _.set(new MLabJournal(id), 'nextEventSeq', MLabJournal.connected(function (inc, cb) {
      MLabJournal.journals.findOne({ _id : id }, pass(function (journal) {
        MLabJournal.journals.update({ _id : id }, { $set : { nextSeq : journal.nextSeq + inc } }, pass(function () {
          cb(false, journal.nextSeq);
        }, cb));
      }, cb));
    }));
  });
});
