var _ = require('lodash'),
    BrowserIo = require('./browser');

function SocketIo() {
  BrowserIo.call(this);
  // Note that 'io' is a global from /socket.io/socket.io.js
  this.socket = io(this.url('io'));
  this.socket.on('connect_error', _.bind(this.close, this));

  var jwt = this.jwt;
  this.socket.on('user.token', function (tokenIs) { tokenIs(jwt); });
}

SocketIo.prototype = Object.create(BrowserIo.prototype);
SocketIo.prototype.constructor = SocketIo;

SocketIo.prototype.subscribe = function () {
  return this.socket.on.apply(this.socket, arguments);
};

SocketIo.prototype.publish = function () {
  return this.socket.emit.apply(this.socket, arguments);
};

SocketIo.prototype.unsubscribe = function () {
  return this.socket.removeListener.apply(this.socket, arguments);
};

SocketIo.prototype.subscribers = function () {
  return _.clone(this.socket.listeners.apply(this.socket, arguments));
};

module.exports = SocketIo;
