var _ = require('lodash'),
    _url = require('url'),
    pass = require('pass-error'),
    join = require('url-join');

/**
 * Base class for client-side IO.
 */
function Io(baseUrl, user) {
  this.baseUrl = _url.parse(baseUrl);
  this.name = Io.nameFromPath(this.baseUrl.pathname);
  this.user = user;
}

/**
 * Utility to get a Framespace name from a URL pathname
 */
Io.nameFromPath = function (pathname) {
  return _.find(pathname.split(/[/?]/g));
};

/**
 * Available message events and their arguments.
 * When publishing, the arguments should match the given array.
 * When subscribing, the arguments have the userId prepended.
 */
Io.messages = {
  'user.connected' : [{ id : String }], // Cannot be published
  'user.disconnected' : [String], // Cannot be published, optional parameter is error cause
  'action' : [Object], // Echoed to publisher
  'interactions' : [Array] // NOT echoed to publisher
};

/**
 * Appends arguments as path names to the base url
 */
Io.prototype.url = function () {
  return join.apply(null, [_url.format({
    protocol : this.baseUrl.protocol,
    auth : this.baseUrl.auth,
    host : this.baseUrl.host
  }), this.name].concat(_.toArray(arguments)));
};

/**
 * GET method requests JSON from the base url plus the given path
 */
Io.prototype.get = function (path, cb/*(err, body)*/) {
  throw undefined;
};

/**
 * Destroy the current IO session and report the given error.
 * Should also give rise to a user.disconnected event with the error.
 * @param err [optional] error to close with
 */
Io.prototype.close = function (err) {
  throw undefined;
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
 * Emits the given data locally (not to the IO channel).
 * Useful when simulating or batching channel IO.
 * @param data array of message arguments, including user id.
 */
Io.prototype.emit = function (eventName, data) {
  _.each(this.subscribers(eventName), function (subscriber) {
    subscriber.apply(this, data);
  });
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
    messages = _.uniqBy((messages || []).concat(pausedMessages), iteratee);
    _.each(messages, _.bind(this.emit, this, eventName));
  }, this));
};

module.exports = Io;
