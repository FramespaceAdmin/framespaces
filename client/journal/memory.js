var _ = require('lodash'),
    _async = require('async'),
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

MemoryJournal.prototype.fetchEvents = _async.asyncify(function () {
  return this.events;
});

MemoryJournal.prototype.addEvent = _async.asyncify(function (event) {
  return this.events.push.apply(this.events, _.castArray(event));
});

module.exports = MemoryJournal;
