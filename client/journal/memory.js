var _ = require('lodash'),
    _events = require('../../lib/events'),
    Journal = require('../journal');

/**
 * The events passed here are for unit testing purposes: array or override function
 */
function MemoryJournal(ns, events) {
  Journal.call(this, ns);
  if (_.isFunction(events)) {
    this.fetchEvents = events;
  } else if (_.isArray(events)) {
    this.events = events;
  } else {
    this.events = [];
  }
}

MemoryJournal.prototype = Object.create(Journal.prototype);
MemoryJournal.prototype.constructor = MemoryJournal;

MemoryJournal.prototype.length = function () {
  return this.events.length;
};

MemoryJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  var events = this.events, snapshot = this.snapshot;
  this.asyncSuccess(cb, snapshot, events);
};

MemoryJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, length)*/) {
  var length = this.events.push.apply(this.events, _events.from(data, timestamp)),
      snapshot = this.maybeSnapshot(0, subject, timestamp);
  if (snapshot) {
    this.events = [];
    this.snapshot = snapshot;
    length = 0;
  }
  this.asyncSuccess(cb, length);
};

module.exports = MemoryJournal;
