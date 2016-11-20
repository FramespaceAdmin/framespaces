var _ = require('lodash'),
    _url = require('url'),
    fs = require('../fs'),
    Io = require('../io');

function SocketIo(jwt, cb) {
  // Note that 'io' is a global from /socket.io/socket.io.js
  this.socket = io(fs.url('io'));

  this.socket.on('connect', _.partial(cb, false));
  this.socket.on('connect_error', cb);

  this.socket.on('user.token', function (tokenIs) { tokenIs(jwt); });
}

SocketIo.prototype = Object.create(Io.prototype);
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
