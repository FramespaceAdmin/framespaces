require('jsdom-global')();

var _ = require('lodash'),
    _jwt = require('jsonwebtoken'),
    _url = require('url'),
    assert = require('chai').assert,
    pass = require('pass-error'),
    guid = require('../lib/guid'),
    jsdom = require('jsdom'),
    http = require('http'),
    createServer = require('http').createServer,
    setCookie = require('js-cookie').set,
    Io = require('../client/io'),
    itIsIO = require('./ioSpec'),
    Journal = require('../server/journal/taffy');

// Additional options passed to newClientIo
var OPTIONS = _.assign(itIsIO.OPTIONS, {
  user : { id : String }, // Now guaranteed to exist
  name : String, // Framespace name, derived from url
  serverIo : Object
});

module.exports = function (newClientIo/*(options, cb(err, io))*/, ServerIo) {
  var server, serverIo, sockets = [], resources;

  before(function (done) {
    server = createServer(function (req, res) {
      // Slice off the root and the framespace name
      var path = _url.parse(req.url).pathname.split('/').slice(2).join('.');
      if (_.has(resources, path)) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(_.get(resources, path)));
      }
    });
    serverIo = new ServerIo(server);
    server.listen(3001, done);
    server.on('connection', function (socket) {
      var index = sockets.push(socket) - 1;
      socket.on('close', function () {
        sockets[index] = null;
      });
    });
  });

  itIsIO(function (options, cb) {
    options.user || (options.user = { id : guid() });
    _jwt.sign(options.user, 'JWT_SECRET', {}, pass(function (jwt) {
      options.name = options.url ? Io.nameFromPath(_url.parse(options.url).pathname) : 'fs';
      serverIo.createChannel(options.name, Journal, pass(function () {
        jsdom.changeURL(window, options.url || itIsIO.DEFAULT_URL);
        setCookie('jwt', jwt);
        // Handle remote events appearing on the optional events bus
        options.events && _.each(_.keys(Io.messages), function (eventName) {
          options.events.on(eventName, function () {
            serverIo.publish.apply(serverIo, [options.name, eventName].concat(_.toArray(arguments)));
          });
        });
        // Set up additional useful options
        options.serverIo = serverIo;
        newClientIo.call(this, options, pass(function (io) {
          resources = options.resources; // Set here to account for changes in newClientIo
          cb.call(this, false, io);
        }, cb, null, this));
      }, cb, null, this));
    }, cb, null, this));
  });

  after(function (done) {
    _.each(sockets, _.method('destroy'));
    server.close(done);
  });
};

module.exports.OPTIONS = OPTIONS;
