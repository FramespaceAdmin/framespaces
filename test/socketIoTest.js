require('jsdom-global')();

var _ = require('lodash'),
    _jwt = require('jsonwebtoken'),
    _url = require('url'),
    _async = require('async'),
    pass = require('pass-error'),
    guid = require('../lib/guid'),
    jsdom = require('jsdom'),
    createServer = require('http').createServer,
    setCookie = require('js-cookie').set,
    Io = require('../client/io'),
    ClientIo = require('../client/io/socket-io'),
    ServerIo = require('../server/io/socket-io'),
    itIsIO = require('./ioSpec');

global.io = require('socket.io-client');

describe('Socket.io IO', function () {
  var server, serverIo, resources;

  before(function (done) {
    server = createServer(function (req, res) {
      var resName = _url.parse(req.url).pathname.split('/')[2];
      if (_.has(resources, resName)) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(resources[resName]));
      }
    });
    server.listen(3001, done);
    serverIo = new ServerIo(server);
  });

  itIsIO(function (options, cb) {
    _async.auto({
      ns : function (cb) {
        var name = options.url ? Io.nameFromPath(_url.parse(options.url).pathname) : 'fs';
        serverIo.createChannel(name, cb);
      },
      jwt : function (cb) {
        _jwt.sign(options.user || { id : guid() }, 'JWT_SECRET', {}, cb);
      }
    }, pass(function ($) {
      jsdom.changeURL(window, options.url || itIsIO.DEFAULT_URL);
      setCookie('jwt', $.jwt);
      options.events && _.each(_.keys(Io.messages), function (eventName) {
        options.events.on(eventName, function () {
          var args = ['emit', eventName].concat(_.toArray(arguments));
          _.each($.ns.connected, _.method.apply(_, args));
        });
      });
      resources = options.get;
      cb(false, new ClientIo());
    }, cb));
  });

  after(function (done) {
    server.close(done);
  });
});
