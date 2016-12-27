var _ = require('lodash'),
    log = require('../../lib/log'),
    realtime = require('ably').Realtime,
    validate = require('../../lib/validate'),
    pass = require('pass-error'),
    Io = require('../io');

function AblyIo() {
  this.ably = realtime({ key : 'sV1fJg.GU6wQw:Pd93KJ6tGjiSogGb'});
}

AblyIo.prototype = Object.create(Io.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.createChannel = function (name, journal, cb/*(err)*/) {
  var channel = this.ably.channels.get(name);
  // This is not strictly necessary but fulfills the async contract
  channel.attach(cb);
  // TODO: Replace with a webtask to achieve stateless nirvana
  channel.subscribe('action', function (message) {
    validate.action(message.data, pass(function () {
      journal.addEvent(message.data, pass(_.noop, log.error));
    }, log.error));
  });
};

AblyIo.prototype.authorise = function (name, userId, cb/*(err, authorisation)*/) {
  this.ably.auth.createTokenRequest({
    clientId : userId,
    capability : JSON.stringify(_.set({}, name, ['subscribe', 'publish', 'presence']))
  }, cb);
};

module.exports = AblyIo;
