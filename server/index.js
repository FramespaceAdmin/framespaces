var _ = require('lodash'),
    config = require('config'),
    log = require('../lib/log'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    app = express(),
    server = require('http').createServer(app),
    _word = require('./word'),
    pass = require('pass-error'),
    _async = require('async'),
    auth = require('./auth'),
    port = process.env.PORT || 3000,
    modules = require('../lib/modules'),
    io = new (require(modules.io))(server),
    Journal = (require(modules.journal));

// Note, this is used from the stop and restart scripts
process.title = 'Framespaces';

app.set('view engine', 'ejs');
app.use('/web', express.static('dist'));
app.use(bodyParser.json());
app.use(cookieParser());

/**
 * GETting the base URL creates a new framespace with a new name
 * NOTE this route does not require authorisation
 */
app.get('/', function (req, res, next) {
  // Create a new framespace and redirect to it
  _async.auto({
    name : function (cb) {
      return _async.concatSeries(['adjective', 'noun'], function (partOfSpeech, cb) {
        _word.random({ includePartOfSpeech : partOfSpeech, maxLength : 5 }, cb);
      }, pass(function (words) { cb(false, words.join('')); }, cb));
    },
    journal : ['name', function ($, cb) {
      return Journal($.name).putDetails({ name : $.name, created : new Date().getTime() }, cb);
    }],
    channel : ['name', 'journal', function ($, cb) {
      return io.createChannel($.name, Journal, cb);
    }]
  }, pass(function ($) {
    return res.redirect('/' + $.name);
  }, next));
});

/**
 * GETting a framespace renders the HTML
 * NOTE this generates an anonymous user cookie if there isn't one on the request.
 * TODO ... unless the framespace is private.
 */
app.get('/:fsName', auth.setCookie, function (req, res, next) {
  Journal(req.params.fsName).fetchDetails(pass(function (fs) {
    return fs ? res.render('index', { fs : fs, config : config }) : res.sendStatus(404);
  }, next));
});

/**
 * GETting the actions for a framespace.
 */
app.get('/:fsName/actions', auth.cookie, function (req, res, next) {
  Journal(req.params.fsName).fetchEvents(pass(function (actions) {
    return res.send(actions);
  }, next));
});

/**
 * GETting authorisation to use the realtime channel for a framespace
 */
app.get('/:fsName/channel/auth', auth.cookie, function (req, res, next) {
  io.authorise(req.params.fsName, req.user.id, pass(_.bind(res.send, res), next));
});

/**
 * GETting an error page from the client side
 */
app.get('/:fsName/error', function (req, res, next) {
  next(req.query.cause);
});

server.listen(port, pass(function () {
  log.info('Framespaces listening on port', port);
}, log.error));
