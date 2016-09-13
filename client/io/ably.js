var _ = require('lodash'),
    _url = require('url'),
    fsUrl = require('../fsUrl'),
    jwtDecode = require('jwt-decode'),
    pass = require('pass-error'),
    Io = require('../io');

function AblyIo(jwt, cb) {
  // Note that 'Ably.Realtime' is a global from https://cdn.ably.io/lib/ably.min.js
  var ably = Ably.Realtime({ authUrl : fsUrl.append('channel/auth'), echoMessages : false }),
      channel = ably.channels.get(fsUrl.name),
      user = jwtDecode(jwt);

  channel.presence.get(pass(function(members) {
    channel.presence.enter(user, pass(function () {
      cb(false); // Ensure the current user is first
      // Notify ourselves of the existing users
      _.each(this.subscribers('user.connected'), function (subscriber) {
        _.each(members, function (member) {
          subscriber(member.data.id, member.data);
        });
      });
    }, cb, null, this));
  }, cb, null, this));

  // subscribers member is array if pairs [[subscriber, ablySubscriber]]
  this.events = {
    'user.connected' : { emitter : channel.presence, name : 'enter', subscribers : [] },
    'user.disconnected' : { emitter : channel.presence, name : 'leave', subscribers : [] },
    'action' : { emitter : channel, name : 'action', subscribers : [] },
    'interactions' : { emitter : channel, name : 'interactions', subscribers : [] }
  };
}

AblyIo.prototype = Object.create(Io.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.subscribe = function (eventName, subscriber) {
  var event = this.events[eventName];
  // Ably subscribers get a Message object, not just data
  var ablySubscriber = _.bind(function (message) {
    subscriber.apply(this, [message.clientId].concat(message.data));
  }, this);
  event.emitter.subscribe(event.name, ablySubscriber);
  event.subscribers.push([subscriber, ablySubscriber]);
};

AblyIo.prototype.publish = function (eventName/*, data..., cb*/) {
  var event = this.events[eventName],
      data = _.tail(_.toArray(arguments)),
      cb = _.isFunction(_.last(data)) ? data.pop() : undefined;
  event.emitter.publish(event.name, data, cb);
};

AblyIo.prototype.unsubscribe = function (eventName, subscriber) {
  var event = this.events[eventName],
      ablySubscriber = _.remove(event.subscribers, [0, subscriber])[0][1];
  event.emitter.unsubscribe(event.name, ablySubscriber);
};

AblyIo.prototype.subscribers = function (eventName) {
  return _.map(this.events[eventName].subscribers, 0);
};

module.exports = AblyIo;
