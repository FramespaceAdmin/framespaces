var _ = require('lodash'),
    _path = require('path'),
    pass = require('pass-error'),
    itIsAJournal = require('./journalSpec'),
    proxyquire = require('proxyquire').noCallThru(),
    tingodb = require('tingodb'),
    MongoDbJournal = proxyquire('../server/journal/mongodb', {
      'config' : _({ snapshotFrequency : 0 })
    });

// Tests MongoDb implementation of Journal functionality.
describe('Journal (MongoDB)', function () {
  before(function () {
    process.env.FS_SECRET = 'secret';
    MongoDbJournal.client = function (cb) {
      cb(false, new (tingodb().Db)(_path.join(__dirname, '/data'), {}));
    };
  });

  afterEach(function (done) {
    MongoDbJournal.journals.remove();
    MongoDbJournal.snapshots.remove();
    MongoDbJournal.events.remove();
    MongoDbJournal.close(done);
  });

  itIsAJournal(MongoDbJournal);
});
