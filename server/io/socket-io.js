var _ = require('lodash'),
    _async = require('async'),
    _jwt = require('jsonwebtoken'),
    log = require('../../lib/log'),
    Io = require('../io');

function SocketIo(server) {
  this.io = require('socket.io')(server);
}

SocketIo.prototype = Object.create(Io.prototype);
SocketIo.prototype.constructor = SocketIo;

SocketIo.prototype.createChannel = function (name, cb/*(err)*/) {
  var ns = this.io.of('/' + name + '/io');
  ns.on('connection', function (socket) {
    // Challenge the new socket to provide a JWT
    socket.emit('user.token', function (jwt) {
      socket.user = _jwt.decode(jwt); // minor object pollution
      log.debug('User', socket.user.id, 'connected');
      socket.broadcast.emit('user.connected', socket.user.id, socket.user);
    });

    _.each(ns.connected, function (otherSocket) {
      if (otherSocket !== socket && otherSocket.user) {
        socket.emit('user.connected', otherSocket.user.id, otherSocket.user);
      }
    });

    socket.on('action', function (action, cb) {
      socket.broadcast.emit('action', socket.user.id, action);
      socket.emit('action', socket.user.id, action); // Actions are echoed
      cb && cb(false);
    });

    socket.on('interactions', function (interactions) {
      socket.broadcast.emit('interactions', socket.user.id, interactions);
    });

    socket.on('disconnect', function () {
      socket.broadcast.emit('user.disconnected', socket.user.id);
      log.debug('User', socket.user.id, 'disconnected');
    });
  });
  _async.nextTick(_async.apply(cb, false, ns));
};

module.exports = SocketIo;
