var _ = require('lodash'),
    _async = require('async'),
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

LocalJournal.prototype.fetchEvents = _async.asyncify(function () {
  var events = new Array(this.length());
  for (var i = 0; i < events.length; i++) {
    events[i] = JSON.parse(browser.localStorage.getItem(this.ns + ':' + i));
  }
  return events;
});

LocalJournal.prototype.addEvent = _async.asyncify(function (event) {
  var len = this.length();
  _.each(_.castArray(event), _.bind(function (e) {
    browser.localStorage.setItem(this.ns + ':' + len, JSON.stringify(e));
    browser.localStorage.setItem(this.ns + ':length', ++len);
  }, this));
  return len;
});

module.exports = LocalJournal;
