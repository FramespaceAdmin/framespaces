var _ = require('lodash'),
    _async = require('async'),
    _events = require('../../lib/events'),
    Journal = require('../journal'),
    taffy = require('taffydb').taffy,
    log = require('../../lib/log');

function TaffyJournal(id) {
  if (!(this instanceof TaffyJournal)) {
    return new TaffyJournal(id);
  }
  Journal.call(this, id);
  if (!_.has(TaffyJournal.journals, id)) {
    TaffyJournal.journals[id] = { details : { name : id }, events : taffy(), nextSeq : 0 };
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

TaffyJournal.prototype.fetchEvents = _async.asyncify(function () {
  return this.journal.events().order('seq asec').get();
});

TaffyJournal.prototype.addEvent = _async.asyncify(function (data, timestamp) {
  var journal = this.journal, events = _events.from(data, timestamp);
  _.each(events, function (event) {
    event.seq = journal.nextSeq++;
  });
  log.trace('Adding events', events);
  journal.events.insert(events);
});

module.exports = TaffyJournal;
