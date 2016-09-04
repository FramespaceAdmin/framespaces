var _ = require('lodash'),
    Io = require('../io');

function SocketIo(userId, cb) {
  // Note that 'io' is a global from /socket.io/socket.io.js
  this.socket = io(window.location + '/io');

  this.socket.on('connect', _.partial(cb, false));
  this.socket.on('connect_error', cb);

  this.socket.on('connected.user', function (userIs) {
    userIs({ id : userId });
  });
}

SocketIo.prototype = Object.create(Io.prototype);
SocketIo.prototype.constructor = SocketIo;

SocketIo.prototype.subscribe = function () {
  this.socket.on.apply(this.socket, arguments);
};

SocketIo.prototype.publish = function () {
  this.socket.emit.apply(this.socket, arguments);
};

SocketIo.prototype.pause = function (eventName, cb/*(err, play(messages, [iteratee=_.identity]))*/) {
  var listeners = this.socket.listeners(eventName), pausedMessages = [];
  function pausedListener() {
    pausedMessages.push(_.toArray(arguments));
  }
  this.socket.removeAllListeners(eventName).on(eventName, pausedListener);
  cb(false, _.bind(function (messages, iteratee) {
    this.socket.removeListener(eventName, pausedListener);
    _.each(listeners, _.bind(this.socket.on, this.socket, eventName));
    // Emit the requested messages, then the paused messages
    _.each(_.uniqBy((messages || []).concat(pausedMessages), iteratee), _.bind(function (args) {
      // Emit locally, not to the socket
      _.each(listeners, function (listener) {
        listener.apply(this.socket, args);
      });
    }, this));
  }, this));
};

module.exports = SocketIo;
