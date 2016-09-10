var _ = require('lodash'),
    EventEmitter = require('events');

/**
 * Base interface for client-side channels.
 */
function Io() {
}

/**
 * Available message events and their arguments
 */
Io.messages = {
  'user.connected' : [{ id : String }],
  'user.disconnected' : [],
  'action' : [Object],
  'interactions' : [Array]
};

Io.prototype = Object.create(EventEmitter.prototype);
Io.prototype.constructor = Io;

/**
 * Subscribe to the io channel.
 * NOTE the listener always receives a userId as the first argument.
 * @param eventName channel event name
 * @param listener event listener
 */
Io.prototype.subscribe = function (eventName, listener/*(userId, data...)*/) {
  throw undefined;
};

/**
 * Publish to the io channel.
 * NOTE a userId will be prepended to the arguments for subscribers.
 * @param eventName channel event name
 * @param data... data to publish
 * @param cb optional callback with error
 */
Io.prototype.publish = function (eventName, data/*...*/, cb/*(err)*/) {
  throw undefined;
};

/**
 * Pause the given channel events.
 * The play method given to the callback takes an optional array of messages to play into the
 * channel before also playing any missed events. Each message is an array of listener arguments.
 * Also taken is an optional iteratee method to be used to de-duplicate messages
 * per https://lodash.com/docs/#uniqBy
 * @param eventName channel event name
 * @param cb callback taking error and re-start (play) method
 */
Io.prototype.pause = function (eventName, cb/*(err, play(messages, [iteratee=_.identity]))*/) {
  throw undefined;
};

module.exports = Io;
