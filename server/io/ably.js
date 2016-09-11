var _ = require('lodash'),
    log = require('../../lib/log'),
    realtime = require('ably').Realtime,
    Io = require('../io');

function Ably() {
  this.ably = realtime({ key : 'sV1fJg.GU6wQw:Pd93KJ6tGjiSogGb'});
}

Ably.prototype = Object.create(Io.prototype);
Ably.prototype.constructor = Ably;

Ably.prototype.createChannel = function (name, cb/*(err)*/) {
  // This is not strictly necessary but fulfills the async contract
  this.ably.channels.get(name).attach(cb);
};

Ably.prototype.authorise = function (name, userId, cb/*(err, authorisation)*/) {
  this.ably.auth.createTokenRequest({
    clientId : userId,
    capability : JSON.stringify(_.set({}, name, ['subscribe', 'publish', 'presence']))
  }, cb);
};

module.exports = Ably;
