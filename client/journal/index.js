var _ = require('lodash'),
    _events = require('../../lib/events'),
    config = require('config'),
    browser = require('../browser');

function Journal(ns) {
  if (!(this instanceof Journal) || this.constructor === Journal) {
    if (config.get('modules.io') === 'local') {
      if (browser.localStorage) {
        return new (require('./local'))();
      } else {
        return new (require('./memory'))();
      }
    } else {
      return new (require('./remote'))();
    }
  }
  this.ns = ns;
}

/**
 * @return the number of events since the last snapshot (not in the whole journal)
 */
Journal.prototype.length = function () {
  throw undefined;
};

/**
 * Adds an event to the Journal.
 * @param subject the subject of the journal, from which it may collect a snapshot
 * @param data the event or array of events to add
 * @param timestamp when the events occurred
 * @param cb callback with error and new length
 */
Journal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, length)*/) {
  throw undefined;
};

/**
 * Fetches snapshot and events (after the snapshot) from the Journal.
 * @param ns namespace to retrieve from
 * @param cb callback with error, snapshot and event array
 */
Journal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  throw undefined;
};

/**
 * Utility function to take a snapshot if one is due. Returns: {
 *   snapshot : snapshot taken from subject, as _events.SNAPSHOT, or undefined
 *   events : events taken from the given data, as array of _events.EVENT
 * }
 * @param subject the subject of the journal, from which it may collect a snapshot
 * @param data the event data (array or single object)
 * @param timestamp when the events occurred
 * @return the snapshot and new events
 */
Journal.prototype.maybeSnapshot = function (subject, data, timestamp) {
  var events = _events.from(data, timestamp), snapshot;
  if (events.length && this.length() + events.length >= config.get('snapshotFrequency')) {
    snapshot = { lastEventId : _.last(events).id, state : subject.getState(), timestamp : timestamp };
  }
  return { snapshot : snapshot, events : events };
};

/**
 * Utility to tidy up synchronous responses
 */
Journal.prototype.asyncSuccess = function (cb/*, args...*/) {
  setTimeout.apply(null, [cb, 0, false].concat(_.slice(arguments, 1)));
};

module.exports = Journal;
