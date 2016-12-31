var _ = require('lodash'),
    jwtDecode = require('jwt-decode'),
    pass = require('pass-error'),
    BrowserIo = require('./browser');

function AblyIo() {
  BrowserIo.call(this);
  // Note that 'Ably.Realtime' is a global from https://cdn.ably.io/lib/ably.min.js
  var ably = Ably.Realtime({ authUrl : this.url('channel/auth') }),
      channel = ably.channels.get(this.name);

  channel.presence.get(pass(function(members) {
    channel.presence.enter(this.user, pass(function () {
      // Notify ourselves of connected user
      this.emit('user.connected', [this.user.id, this.user]);
      // Notify ourselves of the existing users
      _.each(members, function (member) {
        this.emit('user.connected', [member.data.id, member.data]);
      });
    }, this.close, null, this));
  }, this.close, null, this));

  // subscribers member is array of pairs [[subscriber, ablySubscriber]]
  this.events = {
    'user.connected' : { emitter : channel.presence, name : 'enter', subscribers : [] },
    'user.disconnected' : { emitter : channel.presence, name : 'leave', subscribers : [] },
    'action' : { emitter : channel, name : 'action', subscribers : [], echo : true },
    'interactions' : { emitter : channel, name : 'interactions', subscribers : [] }
  };
}

AblyIo.prototype = Object.create(BrowserIo.prototype);
AblyIo.prototype.constructor = AblyIo;

AblyIo.prototype.subscribe = function (eventName, subscriber) {
  var event = this.events[eventName];
  // Ably subscribers get a Message object, not just data
  var ablySubscriber = _.bind(function (message) {
    if (event.echo || message.clientId !== this.user.id) {
      subscriber.apply(this, [message.clientId].concat(message.data));
    }
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
