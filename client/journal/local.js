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
  return Number(browser.localStorage.getItem(this.ns + ':length')) || 0;
};

LocalJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  var events = new Array(this.length());
  for (var i = 0; i < events.length; i++) {
    events[i] = JSON.parse(browser.localStorage.getItem(this.ns + ':' + i));
  }
  setTimeout(function () { cb(false, null, events) }, 0);
};

LocalJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  var len = this.length();
  _.each(_events.from(data, timestamp), _.bind(function (e) {
    browser.localStorage.setItem(this.ns + ':' + len, JSON.stringify(e));
    browser.localStorage.setItem(this.ns + ':length', ++len);
  }, this));
  setTimeout(function () { cb(false, len) }, 0);
};

module.exports = LocalJournal;
