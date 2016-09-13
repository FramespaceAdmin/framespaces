var _ = require('lodash'),
    log = require('../../lib/log'),
    realtime = require('ably').Realtime,
    Io = require('../io');

function AblyIo() {
  this.ably = realtime({ key : 'sV1fJg.GU6wQw:Pd93KJ6tGjiSogGb'});
}

AblyIo.prototype = Object.create(Io.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.createChannel = function (name, cb/*(err)*/) {
  // This is not strictly necessary but fulfills the async contract
  this.ably.channels.get(name).attach(cb);
};

AblyIo.prototype.authorise = function (name, userId, cb/*(err, authorisation)*/) {
  this.ably.auth.createTokenRequest({
    clientId : userId,
    capability : JSON.stringify(_.set({}, name, ['subscribe', 'publish', 'presence']))
  }, cb);
};

module.exports = AblyIo;
