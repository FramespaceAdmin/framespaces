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
 */
function TaffyJournal(server, app) {
  if (!(this instanceof TaffyJournal)) {
    return new TaffyJournal(server, app);
  }
  Journal.call(this, server, app);
}

TaffyJournal.journals = {};

TaffyJournal.getJournal = function (id) {
  if (!_.has(TaffyJournal.journals, id)) {
    TaffyJournal.journals[id] = {
      details: { name: id },
      events: taffy(),
      nextSeq: 0,
      snapshot: null
    };
  }
  return TaffyJournal.journals[id];
};

TaffyJournal.prototype = Object.create(Journal.prototype);
TaffyJournal.prototype.constructor = TaffyJournal;

TaffyJournal.prototype.fetchDetails = _async.asyncify(function (name) {
  return TaffyJournal.getJournal(name).details;
});

TaffyJournal.prototype.putDetails = _async.asyncify(function (name, details) {
  log.debug('Putting details', details);
  TaffyJournal.getJournal(name).details = details;
  return details;
});

TaffyJournal.prototype.fetchEvents = function (name, cb) {
  var snapshot = TaffyJournal.getJournal(name).snapshot,
      events = TaffyJournal.getJournal(name).events().order('seq asec').get();
  return _async.nextTick(cb, false, snapshot, events);
};

TaffyJournal.prototype.addEvent = _async.asyncify(function (name, data, timestamp) {
  var journal = TaffyJournal.getJournal(name), events = _events.from(data, timestamp);
  _.each(events, function (event) { event.seq = journal.nextSeq++; });
  log.trace('Adding events', events);
  journal.events.insert(events);
});

TaffyJournal.prototype.offerSnapshot = _async.asyncify(function (name, timestamp, cb/*(err, nonce)*/) {
  // Policy: take any snapshot if we don't already have it
  var lastSnapshot = TaffyJournal.getJournal(name).snapshot, events = TaffyJournal.getJournal(name).events;
  if ((!lastSnapshot || timestamp !== lastSnapshot.timestamp) &&
      events().count() >= config.get('snapshotFrequency')) {
    return timestamp; // Trivial nonce to say good to go
  }
});

TaffyJournal.prototype.addSnapshot = _async.asyncify(function (name, nonce, snapshot, cb/*(err)*/) {
  if (snapshot.timestamp === nonce) { // Trivial nonce check
    TaffyJournal.getJournal(name).snapshot = snapshot;
    TaffyJournal.getJournal(name).events().remove();
  } else {
    throw 'Bad nonce';
  }
});

module.exports = TaffyJournal;
