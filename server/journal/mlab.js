var _ = require('lodash'),
    _async = require('async'),
    log = require('../../lib/log'),
    mongodb = require('mongodb'),
    pass = require('pass-error'),
    Journal = require('../journal');

function MLabJournal(id) {
  if (!(this instanceof MLabJournal)) {
    return new MLabJournal(id);
  }
  Journal.call(this, id);
}

MLabJournal.connected = function connected(member) {
  return function () {
    var args = _.toArray(arguments), cb = _.last(args);
    if (MLabJournal.db) {
      member.apply(this, args);
    } else {
      log.debug('Connecting to MLab');
      mongodb.MongoClient.connect(process.env.FS_MLAB_DEV_URL, pass(function (db) {
        MLabJournal.db = db;
        MLabJournal.journals = db.collection('journals');
        MLabJournal.events = db.collection('events');
        member.apply(this, args);
      }, cb, null, this));
    }
  }
};

MLabJournal.close = function (cb) {
  if (MLabJournal.db) {
    MLabJournal.db.close(cb);
    delete MLabJournal.db;
    delete MLabJournal.journals;
    delete MLabJournal.events;
  }
}

MLabJournal.prototype = Object.create(Journal.prototype);
MLabJournal.prototype.constructor = MLabJournal;

MLabJournal.prototype.fetchDetails = MLabJournal.connected(function (cb/*(err, details)*/) {
  log.debug('Fetching details for', this.id);
  return MLabJournal.journals.findOne({ _id : this.id }, pass(function (details) {
    log.debug('Fetched details', details);
    cb(false, details);
  }, cb));
});

MLabJournal.prototype.fetchEvents = MLabJournal.connected(function (cb/*(err, [event])*/) {
  return MLabJournal.events.find({ fs : this.id }, { sort : { seq : 1 } }).toArray(cb);
});

MLabJournal.prototype.putDetails = MLabJournal.connected(function (details, cb/*(err)*/) {
  return MLabJournal.journals.insert(_.assign(details, {
    _id : this.id,
    nextSeq : 0
  }), pass(function (result) {
    return cb(false, details);
  }, cb));
});

MLabJournal.prototype.nextEventSeq = MLabJournal.connected(function (inc, cb/*(err, nextSeq)*/) {
  MLabJournal.journals.findAndModify(
    { _id : this.id }, // Query
    [], // Sort
    { $inc : { nextSeq : inc } }, // Doc (to be updated)
    { fields : { nextSeq : true } }, // Options
    pass(function (result) {
      cb(false, result.value.nextSeq);
    }, cb, null, this));
});

MLabJournal.prototype.addEvent = MLabJournal.connected(function (event, cb/*(err)*/) {
  // Atomically get a block of sequence numbers from the database
  var events = _.castArray(event);
  this.nextEventSeq(events.length, pass(function (nextSeq) {
    MLabJournal.events.insert(_.map(events, _.bind(function (event) {
      return _.assign(event, {
        seq : nextSeq++,
        fs : this.id
      });
    }, this)), cb);
  }, cb, null, this));
});

module.exports = MLabJournal;
