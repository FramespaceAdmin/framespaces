var _ = require('lodash'),
    _events = require('../../lib/events'),
    browser = require('../browser'),
    Journal = require('../journal');

function LocalJournal(ns) {
  Journal.call(this, ns);
}

LocalJournal.prototype = Object.create(Journal.prototype);
LocalJournal.prototype.constructor = LocalJournal;

LocalJournal.prototype.length = function () {
  return Number(browser.localStorage.getItem(this.ns + ':events:length')) || 0;
};

/**
 * Utility to set/get/remove local storage item strings
 */
LocalJournal.prototype.item = function (key, str) {
  var itemKey = this.ns + ':' + key;
  return _.isUndefined(str) ? browser.localStorage.getItem(itemKey) : 
    str == null ? browser.localStorage.removeItem(itemKey) :
    browser.localStorage.setItem(itemKey, str);
};

LocalJournal.prototype.snapshotItem = function (snapshot) {
  if (_.isUndefined(snapshot)) {
    var state = this.item('snapshot:state'),
        timestamp = Number(this.item('snapshot:timestamp')) || 0;
    if (state != null) {
      return { state : state, timestamp : timestamp };
    }
  } else if (snapshot == null) {
    this.item('snapshot:state', null);
    this.item('snapshot:timestamp', null);
  } else {
    this.item('snapshot:state', snapshot.state);
    this.item('snapshot:timestamp', snapshot.timestamp);
  }
};

LocalJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  var events = new Array(this.length()), snapshot = this.snapshotItem();
  _.times(events.length, _.bind(function (i) { events[i] = JSON.parse(this.item('events:' + i)); }, this));
  this.asyncSuccess(cb, snapshot, events);
};

LocalJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  var length = this.length(), events = _events.from(data, timestamp),
      snapshot = this.maybeSnapshot(events.length, subject, timestamp);
  if (snapshot) {
    _.times(length, _.bind(function (i) { this.item('events:' + i, null); }, this));
    this.item('events:length', length = 0);
    this.snapshotItem(snapshot);
  } else {
    _.each(events, _.bind(function (e) { this.item('events:' + length++, JSON.stringify(e)); }, this));
    this.item('events:length', length);
  }
  this.asyncSuccess(cb, length);
};

module.exports = LocalJournal;
