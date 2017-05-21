var _async = require('async'),
    request = require('request'),
    browser = require('../browser'),
    Journal = require('../journal');

function RemoteJournal(ns) {
  Journal.call(this, ns);
}

RemoteJournal.prototype = Object.create(Journal.prototype);
RemoteJournal.prototype.constructor = RemoteJournal;

RemoteJournal.prototype.fetchEvents = function (cb) {
  request({ url : browser.url(this.ns, 'events'), json : true }, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      cb(err || body);
    } else {
      cb(false, body);
    }
  });
};

RemoteJournal.prototype.addEvent = _async.asyncify(function (event) {
  // Do nothing - the journalling is done by the server
  return true;
});

module.exports = RemoteJournal;
