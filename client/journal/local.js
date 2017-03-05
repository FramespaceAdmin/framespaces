var _ = require('lodash'),
    Journal = require('../journal');

function LocalJournal() {
  Journal.call(this);
}

LocalJournal.prototype = Object.create(Journal.prototype);
LocalJournal.prototype.constructor = LocalJournal;

LocalJournal.prototype.length = function (ns) {
  return Number(localStorage.getItem(ns + ':length')) || 0;
};

LocalJournal.prototype.fetchEvents = function (ns) {
  var events = new Array(this.length(ns));
  for (var i = 0; i < events.length; i++) {
    events[i] = JSON.parse(localStorage.getItem(ns + ':' + i));
  }
  return events;
};

LocalJournal.prototype.addEvent = function (ns, event) {
  var len = this.length(ns);
  localStorage.setItem(ns + ':' + len, JSON.stringify(event));
  localStorage.setItem(ns + ':length', ++len);
  return len;
};

module.exports = LocalJournal;
