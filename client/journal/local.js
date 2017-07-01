var _ = require('lodash'),
    browser = require('../browser'),
    log = require('../../lib/log'),
    Journal = require('../journal');

function LocalJournal(ns) {
  Journal.call(this, ns);

  this.tabElect = browser.tabElect(ns);
  this.tabElect.on('elected', _.bind(log.info, log, 'Elected Local Journal leader'));
  this.tabElect.on('deposed', _.bind(log.info, log, 'Unelected Local Journal leader'));
  this.tabElect.on('error', _.bind(log.error, log, 'Journal leadership error: %s'));
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
    !this.tabElect.isLeader ? undefined :
    str == null ? browser.localStorage.removeItem(itemKey) :
    browser.localStorage.setItem(itemKey, str);
};

LocalJournal.prototype.snapshotItem = function (snapshot) {
  if (_.isUndefined(snapshot)) {
    var state = this.item('snapshot:state'),
        timestamp = Number(this.item('snapshot:timestamp')) || 0,
        lastEventId = this.item('snapshot:lastEventId');
    if (state != null) {
      return { lastEventId : lastEventId, state : state, timestamp : timestamp };
    }
  } else if (snapshot == null) {
    this.item('snapshot:lastEventId', null);
    this.item('snapshot:state', null);
    this.item('snapshot:timestamp', null);
  } else {
    this.item('snapshot:lastEventId', snapshot.lastEventId);
    this.item('snapshot:state', snapshot.state);
    this.item('snapshot:timestamp', snapshot.timestamp);
  }
};

LocalJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  var events = new Array(this.length()), snapshot = this.snapshotItem();
  _.times(events.length, _.bind(function (i) {
    events[i] = JSON.parse(this.item('events:' + i));
  }, this));
  this.asyncSuccess(cb, snapshot, events);
};

LocalJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  var length = this.length(), maybeSnapshot = this.maybeSnapshot(subject, data, timestamp);
  if (maybeSnapshot.snapshot) {
    _.times(length, _.bind(function (i) { this.item('events:' + i, null); }, this));
    this.item('events:length', length = 0);
    this.snapshotItem(maybeSnapshot.snapshot);
  } else {
    _.each(maybeSnapshot.events, _.bind(function (e) {
      this.item('events:' + length++, JSON.stringify(e));
    }, this));
    this.item('events:length', length);
  }
  this.asyncSuccess(cb, length);
};

module.exports = LocalJournal;
