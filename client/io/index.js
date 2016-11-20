var _ = require('lodash');

/**
 * Base interface for client-side channels.
 */
function Io() {
}

/**
 * Available message events and their arguments.
 * When publishing, the arguments should match the given array.
 * When subscribing, the arguments have the userId prepended.
 */
Io.messages = {
  'user.connected' : [{ id : String }], // Cannot be published
  'user.disconnected' : [], // Cannot be published
  'action' : [Object], // Echoed to publisher
  'interactions' : [Array] // NOT echoed to publisher
};

/**
 * Subscribe to the io channel.
 * NOTE the subscriber always receives a userId as the first argument.
 * @param eventName channel event name
 * @param subscriber event subscriber
 * @return this, for chaining
 */
Io.prototype.subscribe = function (eventName, subscriber/*(userId, data...)*/) {
  throw undefined;
};

/**
 * Publish to the io channel.
 * NOTE a userId will be prepended to the arguments for subscribers.
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
 * Pause the given channel events.
 * The play method given to the callback takes an optional array of messages to play into the
 * channel before also playing any missed events. Each message is an array of subscriber arguments.
 * Also taken is an optional iteratee method to be used to de-duplicate messages
 * per https://lodash.com/docs/#uniqBy
 * @param eventName channel event name
 * @param cb callback taking error and re-start (play) method
 */
Io.prototype.pause = function (eventName, cb/*(err, play(messages, [iteratee=_.identity]))*/) {
  var subscribers = this.subscribers(eventName), pausedMessages = [];
  function pausedListener() {
    pausedMessages.push(_.toArray(arguments));
  }
  _.each(subscribers, _.bind(this.unsubscribe, this, eventName));
  this.subscribe(eventName, pausedListener);
  cb(false, _.bind(function (messages, iteratee) {
    this.unsubscribe(eventName, pausedListener);
    _.each(subscribers, _.bind(this.subscribe, this, eventName));
    // Emit the requested messages, then the paused messages
    _.each(_.uniqBy((messages || []).concat(pausedMessages), iteratee), _.bind(function (args) {
      // Emit locally, not to the socket
      _.each(subscribers, function (subscriber) {
        subscriber.apply(this, args);
      });
    }, this));
  }, this));
};

module.exports = Io;
