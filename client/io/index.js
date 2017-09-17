var _ = require('lodash'),
    config = require('config'),
    pass = require('pass-error'),
    log = require('../../lib/log');

/**
 * Base class for client-side IO.
 */
function Io(name, user) {
  if (!(this instanceof Io) || this.constructor === Io) {
    if (config.get('modules.io') === 'local') {
      return new (require('./local'))(name);
    } else {
      return new (require('io'))(name); // Aliasified, see ../modules.js
    }
  }
  this.user = user;
}

/**
 * Available message events and their arguments.
 * When publishing, the arguments should match the given array.
 * When subscribing, the arguments have the userId prepended.
 */
Io.messages = {
  'user.connected' : { id : String }, // Cannot be published
  'user.disconnected' : String, // Cannot be published, optional parameter is error cause
  'action' : Object, // Echoed to publisher
  'interactions' : Array // NOT echoed to publisher
};

/**
 * Destroy the current IO session and report the given error.
 * Should also give rise to a user.disconnected event with the error.
 * @param err [optional] error to close with
 * @param cb [optional] callback to call (with a close error)
 */
Io.prototype.close = function (err, cb/*(err)*/) {
  throw undefined;
};

/**
 * Subscribe to the io channel.
 * NOTE the subscriber always receives a userId as the first argument.
 * @param eventName channel event name
 * @param subscriber event subscriber
 * @return this, for chaining
 */
Io.prototype.subscribe = function (eventName, subscriber/*(userId, timestamp, data...)*/) {
  throw undefined;
};

/**
 * Publish to the io channel.
 * A userId and timestamp will be prepended to the arguments for subscribers.
 * @param eventName channel event name
 * @param data... data to publish
 * @param cb optional callback with error
 * @return this, for chaining
 */
Io.prototype.publish = function (eventName, data/*...*/, cb/*(err)*/) {
  throw undefined;
};

/**
 * Removes the given subscriber from the event channel.
 */
Io.prototype.unsubscribe = function (eventName, subscriber) {
  throw undefined;
};

/**
 * Gets all the subscription functions for the event channel.
 */
Io.prototype.subscribers = function (eventName) {
  throw undefined;
};

/**
 * Emits the given data locally (not to the IO channel).
 * Useful when simulating or batching channel IO.
 * @param data array of message arguments, including user id and timestamp.
 */
Io.prototype.emit = function (eventName, data) {
  _.each(this.subscribers(eventName), function (subscriber) {
    subscriber.apply(this, data);
  });
};

/**
 * Pause the given channel events.
 * The play method returned takes a function with a normal subscriber signature, which
 * is called as expected for each event in turn.
 * It also takes a callback for when all messages have been played. This callback is passed an unpause function which
 * resumes the normal processing of messages.
 * If not unpaused, the play function can be called again and will receive all events from the original pause.
 * @param eventName channel event name
 * @return re-start (play) method
 */
Io.prototype.pause = function (eventName) {
  var self = this, subscribers = self.subscribers(eventName), pausedMessages = [], unpaused = false;
  function pausedListener() {
    log.trace('Received while paused', _.toArray(arguments));
    pausedMessages.push(_.toArray(arguments));
  }
  _.each(subscribers, _.bind(self.unsubscribe, self, eventName));
  self.subscribe(eventName, pausedListener);
  return function play(subscriber, done/*(unpause)*/) {
    if (unpaused) throw new Error('Already un-paused');
    // Emit the paused messages
    _.each(pausedMessages, function (args) {
      subscriber.apply(self, args);
    });
    done(function unpause() {
      log.trace('Unpausing');
      self.unsubscribe(eventName, pausedListener);
      _.each(subscribers, _.bind(self.subscribe, self, eventName));
      unpaused = true;
    });
  };
};

module.exports = Io;
