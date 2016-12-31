var _ = require('lodash'),
    _async = require('async'),
    guid = require('../lib/guid'),
    EventEmitter = require('events'),
    Io = require('../client/io');

function MockIo(options) {
  options = _.defaults(options, {
    url : 'http://mock.io/fs',
    user : { id : guid() },
    events : new EventEmitter(),
    latency : 0,
    done : _.noop
  });
  Io.call(this, options.url, options.user);
  _.assign(this, _.pick(options, 'events', 'done', 'latency'));
  _.assign(this.get, options.get);
  _.assign(this.publish, options.publish);
  this._publish('user.connected', this.user);
}

MockIo.prototype = Object.create(Io.prototype);
MockIo.prototype.constructor = MockIo;

MockIo.prototype.latent = function (cb, args) {
  setTimeout(_.partial.apply(_, [cb].concat(_.toArray(args))), this.latency);
}

MockIo.prototype.get = function (path, cb/*(err, body)*/) {
  this.latent(cb, [this.get.error, this.get.body]);
};

MockIo.prototype.close = function (err) {
  this.latent(this.done, [err]);
  this._publish('user.disconnected');
};

MockIo.prototype.subscribe = function (eventName, subscriber/*(userId, data...)*/) {
  this.events.on(eventName, _.assign(_.bind(function (userId) {
    if (eventName !== 'interactions' || userId !== this.user.id) { // Interactions not echoed
      this.latent(subscriber, arguments);
    }
  }, this), { subscriber : subscriber, io : this }));
};

// Private implementation of publish that allows publishing of user events
MockIo.prototype._publish = function (eventName/*, data..., cb(err)*/) {
  var data = _.slice(arguments, 1), cb = _.isFunction(_.last(data)) ? data.pop() : _.noop;
  this.latent(_.bind(function () {
    this.events.emit.apply(this.events, [eventName, this.user.id].concat(data));
    cb(this.publish.error);
  }, this));
};

MockIo.prototype.publish = function (eventName/*, data..., cb(err)*/) {
  if (!eventName.startsWith('user.')) {
    this._publish.apply(this, arguments);
  }
};

MockIo.prototype.unsubscribe = function (eventName, subscriber) {
  this.events.removeListener(eventName, _.find(this.events.listeners(eventName), function (listener) {
    return listener.subscriber === subscriber;
  }));
};

MockIo.prototype.subscribers = function (eventName) {
  return _.map(_.filter(this.events.listeners(eventName), _.bind(function (listener) {
    return listener.io === this;
  }, this)), 'subscriber');
};

module.exports = MockIo;
