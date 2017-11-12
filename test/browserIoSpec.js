require('jsdom-global')();

var _ = require('lodash'),
    _jwt = require('jsonwebtoken'),
    assert = require('chai').assert,
    pass = require('pass-error'),
    guid = require('../lib/guid'),
    jsdom = require('jsdom'),
    http = require('http'),
    createServer = require('http').createServer,
    setCookie = require('js-cookie').set,
    Io = require('../client/io'),
    itIsIO = require('./ioSpec'),
    journal = new (require('../server/journal/taffy'))();

// Additional options passed to newClientIo
var OPTIONS = _.assign(itIsIO.OPTIONS, {
  server : Object,
  serverIo : Object
});

module.exports = function (newClientIo/*(name, options, cb(err, io))*/, newServerIo/*(server, cb(err, io))*/) {
  var server, serverIo, sockets = [];

  before(function (done) {
    server = createServer();
    newServerIo.call(this, server, pass(function (io) {
      serverIo = io;
      server.listen(3001, done);
      server.on('connection', function (socket) {
        var index = sockets.push(socket) - 1;
        socket.on('close', function () {
          sockets[index] = null;
        });
      });
    }, done));
  });

  itIsIO(function (name, options, cb) {
    options.user || (options.user = { id : guid() });
    jsdom.changeURL(window, 'http://localhost:3001/' + name);
    _jwt.sign(options.user, 'JWT_SECRET', {}, pass(function (jwt) {
      serverIo.createChannel(name, journal, pass(function () {
        setCookie('jwt', jwt);
        // Handle remote events appearing on the optional events bus
        options.events && _.each(_.keys(Io.messages), function (eventName) {
          options.events.on(eventName, function () {
            serverIo.publish.apply(serverIo, [name, eventName].concat(_.toArray(arguments)));
          });
        });
        // Set up additional useful options
        options.serverIo = serverIo;
        options.server = server;
        newClientIo.call(this, name, options, cb);
      }, cb, null, this));
    }, cb, null, this));
  });

  after(function (done) {
    _.each(sockets, _.method('destroy'));
    server.close(done);
  });
};

module.exports.OPTIONS = OPTIONS;
