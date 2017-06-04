var _ = require('lodash'),
    _async = require('async'),
    _events = require('../../lib/events'),
    config = require('config'),
    Journal = require('../journal'),
    taffy = require('taffydb').taffy,
    log = require('../../lib/log');

/**
 * In-memory implementation of Journal contract.
 * Does not store historic snapshots.
 * @param {String} id 
 */
function TaffyJournal(id) {
  if (!(this instanceof TaffyJournal)) {
    return new TaffyJournal(id);
  }
  Journal.call(this, id);
  if (!_.has(TaffyJournal.journals, id)) {
    TaffyJournal.journals[id] = {
      details : { name : id },
      events : taffy(),
      nextSeq : 0,
      snapshot : null
    };
  }
  this.journal = TaffyJournal.journals[id];
}

TaffyJournal.journals = {};

TaffyJournal.prototype = Object.create(Journal.prototype);
TaffyJournal.prototype.constructor = TaffyJournal;

TaffyJournal.prototype.fetchDetails = _async.asyncify(function () {
  return this.journal.details;
});

TaffyJournal.prototype.putDetails = _async.asyncify(function (details) {
  log.debug('Putting details', details);
  this.journal.details = details;
  return details;
});

TaffyJournal.prototype.fetchEvents = function (cb) {
  var snapshot = this.journal.snapshot,
      events = this.journal.events().order('seq asec').get();
  return _async.nextTick(cb, false, snapshot, events);
};

TaffyJournal.prototype.addEvent = _async.asyncify(function (data, timestamp) {
  var journal = this.journal, events = _events.from(data, timestamp);
  _.each(events, function (event) { event.seq = journal.nextSeq++; });
  log.trace('Adding events', events);
  journal.events.insert(events);
});

TaffyJournal.prototype.offerSnapshot = _async.asyncify(function (timestamp, cb/*(err, nonce)*/) {
  // Policy: take any snapshot if we don't already have it
  var lastSnapshot = this.journal.snapshot, events = this.journal.events;
  if ((!lastSnapshot || timestamp !== lastSnapshot.timestamp) &&
      events().count() >= config.get('snapshotFrequency')) {
    return timestamp; // Trivial nonce to say good to go
  }
});

TaffyJournal.prototype.addSnapshot = _async.asyncify(function (nonce, snapshot, cb/*(err)*/) {
  if (snapshot.timestamp === nonce) { // Trivial nonce check
    this.journal.snapshot = snapshot;
    this.journal.events().remove();
  } else {
    throw 'Bad nonce';
  }
});

module.exports = TaffyJournal;
