var _ = require('lodash'),
    _async = require('async'),
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
    // Challenge the new socket to provide a userId
    socket.emit('connected.user', function (user) {
      socket.user = user; // minor object pollution
      log.debug('User', user.id, 'connected');
      socket.broadcast.emit('user.connected', user.id, user);
    });

    _.each(ns.connected, function (otherSocket) {
      if (otherSocket !== socket && otherSocket.user) {
        socket.emit('user.connected', otherSocket.user.id, otherSocket.user);
      }
    });

    socket.on('action', function (action) {
      socket.broadcast.emit('action', socket.user.id, action);
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
