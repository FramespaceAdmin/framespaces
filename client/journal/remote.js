var _events = require('../../lib/events'),
    request = require('request'),
    pass = require('pass-error'),
    browser = require('../browser'),
    Journal = require('../journal');

function RemoteJournal(ns) {
  Journal.call(this, ns);
  this.len = 0;
}

RemoteJournal.prototype = Object.create(Journal.prototype);
RemoteJournal.prototype.constructor = RemoteJournal;

RemoteJournal.prototype.length = function () {
  return this.len;
};

RemoteJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  request({ url : browser.url(this.ns, 'events'), json : true }, pass(function (res, body) {
    return res.statusCode < 400 ? cb(false, body.snapshot, body.events) : cb(body);
  }, cb));
};

RemoteJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  var events = _events.from(data, timestamp),
      snapshot = this.maybeSnapshot(events.length, subject, timestamp);
  if (snapshot) {
    // Offer the snapshot to the server
    request.post({ url : browser.url(this.ns, 'snapshot'), json : snapshot }, pass(function (res, body) {
      return res.statusCode < 400 ? cb(false, this.len = 0) : cb(body);
    }, cb, null, this));
  } else {
    // Do nothing - event journalling is done by the server
    this.asyncSuccess(cb, this.len = this.len + events.length);
  }
};

module.exports = RemoteJournal;
