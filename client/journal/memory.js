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

MemoryJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  var events = this.events;
  setTimeout(function () { cb(false, null, events); });
};

MemoryJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  var len = this.events.push.apply(this.events, _events.from(data, timestamp));
  setTimeout(function () { cb(false, len); }, 0);
};

module.exports = MemoryJournal;
