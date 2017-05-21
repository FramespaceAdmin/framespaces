if (require('config').get('tests').indexOf('integration') === -1) return;
require('dotenv').config();

var _ = require('lodash'),
    _url = require('url'),
    _async = require('async'),
    pass = require('pass-error'),
    Io = require('../client/io'),
    ClientIo = require('../client/io/ably'),
    ServerIo = require('../server/io/ably'),
    itIsBrowserIO = require('./browserIoSpec');

global.Ably = require('ably'); // Needed by client

describe('Ably IO', function () {
  var auth;

  itIsBrowserIO(function newClientIo(name, options, cb) {
    // Set up server authorisation
    options.serverIo.authorise(name, options.user.id, pass(function (newAuth) {
      auth = newAuth;
      cb(false, _.set(new ClientIo(name), 'latency', 500));
    }, cb));
  }, function newServerIo(server, cb) {
    server.on('request', function (req, res) {
      // TODO: Assumption of default framespace name
      if (req.method === 'GET' && _url.parse(req.url).pathname === '/fs/channel/auth') {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(auth));
      }
    });
    cb(false, new ServerIo(server));
  });
});
