var request = require('request'),
    browser = require('../browser'),
    Journal = require('../journal');

function RemoteJournal(ns) {
  Journal.call(this, ns);
}

RemoteJournal.prototype = Object.create(Journal.prototype);
RemoteJournal.prototype.constructor = RemoteJournal;

RemoteJournal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  request({ url : browser.url(this.ns, 'events'), json : true }, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      cb(err || body);
    } else {
      cb(false, body.snapshot, body.events);
    }
  });
};

RemoteJournal.prototype.addEvent = function (subject, data, timestamp, cb/*(err, n)*/) {
  // Do nothing - the journalling is done by the server
  setTimeout(function () { cb(false, -1); }, 0);
};

module.exports = RemoteJournal;
