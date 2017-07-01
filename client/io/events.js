var _ = require('lodash');

/**
 * Mixes in methods to the prototype that implement a local IO based on an EventEmitter.
 * Requires this to have user and events properties.
 */
exports.mixInto = function (prototype) {
  prototype.latent = function (cb, args) {
    setTimeout(function () {
      cb.apply(null, args || []);
    }, this.latency || 0);
  }

  prototype.subscribe = function (eventName, subscriber/*(userId, timestamp, data...)*/) {
    this.events.on(eventName, _.assign(_.bind(function (userId) {
      if (eventName !== 'interactions' || userId !== this.user.id) { // Interactions not echoed
        this.latent(subscriber, [userId, new Date().getTime()].concat(_.slice(arguments, 1)));
      }
    }, this), { subscriber : subscriber, io : this }));
  };

  // Private implementation of publish that allows publishing of user events
  prototype._publish = function (eventName/*, data..., cb(err)*/) {
    var data = _.slice(arguments, 1), cb = _.isFunction(_.last(data)) ? data.pop() : _.noop;
    this.latent(_.bind(function () {
      this.events.emit.apply(this.events, [eventName, this.user.id].concat(data));
      this.latent(cb, false);
    }, this));
  };

  prototype.publish = function (eventName/*, data..., cb(err)*/) {
    if (!eventName.startsWith('user.')) {
      this._publish.apply(this, arguments);
    }
  };

  prototype.unsubscribe = function (eventName, subscriber) {
    this.events.removeListener(eventName, _.find(this.events.listeners(eventName), function (listener) {
      return listener.subscriber === subscriber;
    }));
  };

  prototype.subscribers = function (eventName) {
    return _.map(_.filter(this.events.listeners(eventName), _.bind(function (listener) {
      return listener.io === this;
    }, this)), 'subscriber');
  };

  prototype.close = function (err, cb) {
    this._publish('user.disconnected', err, cb);
  };
};
