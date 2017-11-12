var _ = require('lodash'),
    log = require('../../lib/log'),
    realtime = require('ably').Realtime,
    validate = require('../../lib/validate'),
    pass = require('pass-error'),
    guid = require('../../lib/guid'),
    Io = require('../io');

function initParams() {
  return { key : process.env.FS_ABLY_KEY, log : { level : log.scale(4, -1) } };
}

function AblyIo() {
  this.realtime = realtime(initParams());
}

AblyIo.prototype = Object.create(Io.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.createChannel = function (name, journal, cb/*(err, channel)*/) {
  var channel = this.realtime.channels.get(name);
  if (channel.state === 'initialized') {
    // Only add subscriber if this is the first time this channel has appeared
    // TODO: Replace with a webtask to achieve stateless nirvana
    channel.subscribe('action', function (message) {
      validate.action(message.data, pass(function () {
        journal.addEvent(name, message.data, message.timestamp, pass(_.noop, log.error));
      }, log.error));
    });
  }
  channel.attach(pass(function () { cb(false, channel); }, cb));
};

AblyIo.prototype.publish = function (name, eventName, userId, data/*...*/, cb/*(err)*/) {
  data = _.slice(arguments, 3);
  cb = _.isFunction(_.last(data)) ? data.pop() : undefined;
  if (eventName === 'user.connected') {
    this.realtime.channels.get(name).presence.enterClient(userId, data, cb);
  } else if (eventName === 'user.disconnected') {
    this.realtime.channels.get(name).presence.leaveClient(userId, data, cb);
  } else {
    realtime(_.set(initParams(), 'clientId', userId)).channels.get(name).publish(eventName, data, cb);
  }
};

AblyIo.prototype.authorise = function (name, userId, cb/*(err, authorisation)*/) {
  this.realtime.auth.createTokenRequest({
    clientId : userId,
    capability : JSON.stringify(_.set({}, name, ['subscribe', 'publish', 'presence']))
  }, cb);
};

module.exports = AblyIo;
