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
 * @param event the event or array of events to add
 * @param cb callback with error
 */
Journal.prototype.addEvent = function (event, cb/*(err)*/) {
  throw undefined;
};

/**
 * Fetches events from the Journal.
 * @param ns namespace ro retrieve from
 * @param cb callback with error and event array
 */
Journal.prototype.fetchEvents = function (cb/*(err, [event])*/) {
  throw undefined;
};

module.exports = Journal;
