var _ = require('lodash'),
    _async = require('async'),
    Journal = require('../journal'),
    taffy = require('taffydb').taffy,
    log = require('../../lib/log');

function TaffyJournal(id) {
  if (!(this instanceof TaffyJournal)) {
    return new TaffyJournal(id);
  }
  Journal.call(this, id);
  if (!_.has(TaffyJournal.journals, id)) {
    TaffyJournal.journals[id] = { details : {}, events : taffy(), nextSeq : 0 };
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
});

TaffyJournal.prototype.fetchEvents = _async.asyncify(function () {
  return this.journal.events().order('seq asec').get();
});

TaffyJournal.prototype.addEvent = _async.asyncify(function (event) {
  var journal = this.journal, timestamp = new Date().getTime();
  _.each(_.castArray(event), function (event) {
    event.timestamp = timestamp;
    event.seq = journal.nextSeq++;
  });
  log.trace('Adding event', event);
  journal.events.insert(event);
});

module.exports = TaffyJournal;
