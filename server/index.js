var _ = require('lodash'),
    log = require('../lib/log'),
    express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    _word = require('./word'),
    pass = require('pass-error'),
    _async = require('async'),
    port = process.env.PORT || 3000,
    Framespace = require('./framespace'),
    framespaces = {};

process.title = 'Framespaces';

app.set('view engine', 'ejs');

app.get('/', function (req, res, next) {
  // Create a new board and redirect to it
  return _async.concatSeries(['adjective', 'noun'], function (partOfSpeech, cb) {
    _word.random({ includePartOfSpeech : partOfSpeech, maxLength : 5 }, cb);
  }, pass(function (path) {
    var fs = new Framespace(io, path.join(''));
    framespaces[fs.name] = fs;
    return res.redirect('/' + fs.name);
  }, next));
});

app.use('/web', express.static('dist'));

app.get('/:fsName', function (req, res) {
  if (framespaces[req.params.fsName]) {
    return res.render('index', { fs : framespaces[req.params.fsName] });
  } else {
    return res.sendStatus(404);
  }
});

server.listen(port, pass(function () {
  log.info('Framespaces listening on port', port);
}, log.error));
