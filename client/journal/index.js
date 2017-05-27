var _ = require('lodash'),
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
 * Adds an event to the Journal.
 * @param subject the subject of the journal, from which it may collect a snapshot
 * @param data the event or array of events to add
 * @param timestamp when the events occurred
 * @param cb callback with error and new length
 */
Journal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
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

module.exports = Journal;
