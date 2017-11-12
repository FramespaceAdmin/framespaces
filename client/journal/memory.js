var _ = require('lodash'),
    Journal = require('../journal');

function MemoryJournal(ns) {
  Journal.call(this, ns);
  this.events = [];
}

MemoryJournal.prototype = Object.create(Journal.prototype);
MemoryJournal.prototype.constructor = MemoryJournal;

MemoryJournal.prototype.length = function () {
  return this.events.length;
};

MemoryJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  this.asyncSuccess(cb, this.snapshot, this.events);
};

MemoryJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, length)*/) {
  var length, maybeSnapshot = this.maybeSnapshot(subject, data, timestamp);
  if (maybeSnapshot.snapshot) {
    this.events = [];
    this.snapshot = maybeSnapshot.snapshot;
    length = 0;
  } else {
    length = this.events.push.apply(this.events, maybeSnapshot.events)
  }
  this.asyncSuccess(cb, length);
};

module.exports = MemoryJournal;
