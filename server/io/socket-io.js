var _ = require('lodash'),
    _async = require('async'),
    _jwt = require('jsonwebtoken'),
    validate = require('../../lib/validate'),
    log = require('../../lib/log'),
    pass = require('pass-error'),
    Io = require('../io');

function SocketIo(server) {
  this.io = require('socket.io')(server);
  this.namespaces = {};
}

SocketIo.prototype = Object.create(Io.prototype);
SocketIo.prototype.constructor = SocketIo;

SocketIo.prototype.createChannel = function (name, journal, cb/*(err)*/) {
  if (!_.has(this.namespaces, name)) {
    log.debug('Creating channel', name);
    var ns = this.namespaces[name] = this.io.of('/' + name + '/io');
    ns.on('connection', function (socket) {
      // Challenge the new socket to provide a JWT
      socket.emit('user.token', function (jwt) {
        socket.user = _jwt.decode(jwt); // minor object pollution
        log.debug('User', socket.user.id, 'connected');

        socket.broadcast.emit('user.connected', socket.user.id, socket.user);
        socket.emit('user.connected', socket.user.id, new Date().getTime(), socket.user);

        _.each(ns.connected, function (otherSocket) {
          if (otherSocket !== socket && otherSocket.user) {
            socket.emit('user.connected', otherSocket.user.id, new Date().getTime(), otherSocket.user);
          }
        });

        socket.on('action', function (action, cb) {
          cb || (cb = _.noop);
          var timestamp = new Date().getTime(), args = ['action', socket.user.id, timestamp, action];
          socket.broadcast.emit.apply(socket.broadcast, args);
          socket.emit.apply(socket, args); // Actions are echoed
          
          validate.action(action, pass(function () {
            journal.addEvent(name, action, timestamp, cb);
          }, cb));
        });

        socket.on('interactions', function (interactions) {
          socket.broadcast.emit('interactions', socket.user.id, new Date().getTime(), interactions);
        });

        socket.on('disconnect', function () {
          socket.broadcast.emit('user.disconnected', socket.user.id, new Date().getTime());
          log.debug('User', socket.user.id, 'disconnected');
        });
      });
    });
  }
  _async.nextTick(cb, false, this.namespaces[name]);
};

SocketIo.prototype.publish = function (name, eventName, userId, data/*...*/, cb/*(err)*/) {
  var dataAndCb = _.slice(arguments, 3), timestamp = new Date().getTime();
  _.each(this.namespaces[name].connected, function (ns) {
    ns.emit.apply(ns, [eventName, userId, timestamp].concat(dataAndCb));
  });
};

module.exports = SocketIo;
