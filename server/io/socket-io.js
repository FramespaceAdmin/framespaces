var _ = require('lodash'),
    _async = require('async'),
    _jwt = require('jsonwebtoken'),
    validate = require('../../lib/validate'),
    log = require('../../lib/log'),
    pass = require('pass-error'),
    modules = require('../../lib/modules'),
    Io = require('../io'),
    Journal = (require('../' + modules.journal));

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
      socket.emit('user.connected', socket.user.id, socket.user);
    });

    _.each(ns.connected, function (otherSocket) {
      if (otherSocket !== socket && otherSocket.user) {
        socket.emit('user.connected', otherSocket.user.id, otherSocket.user);
      }
    });

    socket.on('action', function (action, cb) {
      socket.broadcast.emit('action', socket.user.id, action);
      socket.emit('action', socket.user.id, action); // Actions are echoed
      validate.action(action, pass(function () {
        Journal(name).addEvent(action, cb);
      }, cb));
    });

    socket.on('interactions', function (interactions) {
      socket.broadcast.emit('interactions', socket.user.id, interactions);
    });

    socket.on('disconnect', function () {
      if (socket.user) { // May have failed token challenge
        socket.broadcast.emit('user.disconnected', socket.user.id);
        log.debug('User', socket.user.id, 'disconnected');
      }
    });
  });
  _async.nextTick(_async.apply(cb, false, ns));
};

module.exports = SocketIo;
