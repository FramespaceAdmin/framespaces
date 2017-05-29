var _ = require('lodash'),
    as = require('yavl'),
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
 * Snapshot structure
 */
Journal.SNAPSHOT = {
  state : as(Object, String/*, Element*/),
  timestamp : Number
};

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
 * Utility function to take a snapshot if one is due.
 * @param subject the subject of the journal, from which it may collect a snapshot
 * @param count the number of incoming events
 * @param timestamp when the events occurred
 * @return the snapshot state, or undefined if not due
 */
Journal.prototype.maybeSnapshot = function (count, subject, timestamp) {
  if (this.length() + count >= config.get('snapshotFrequency')) {
    return { state : subject.getState(), timestamp : timestamp };
  }
};

/**
 * Utility to tidy up synchronous responses
 */
Journal.prototype.asyncSuccess = function (cb/*, args...*/) {
  setTimeout.apply(null, [cb, 0, false].concat(_.slice(arguments, 1)));
};

module.exports = Journal;
