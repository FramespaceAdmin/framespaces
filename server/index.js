var _ = require('lodash'),
    log = require('../lib/log'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    server = require('http').createServer(app),
    _word = require('./word'),
    pass = require('pass-error'),
    _async = require('async'),
    port = process.env.PORT || 3000,
    validate = require('../lib/validate'),
    io = new (require('./io/socket-io'))(server),
    store = new (require('./store/taffy'))();

// Note, this is used from the stop and restart scripts
process.title = 'Framespaces';

app.set('view engine', 'ejs');
app.use('/web', express.static('dist'));
app.use(bodyParser.json());

/**
 * GETting the base URL creates a new framespace with a new name
 */
app.get('/', function (req, res, next) {
  // Create a new board and redirect to it
  _async.auto({
    name : function (cb) {
      return _async.concatSeries(['adjective', 'noun'], function (partOfSpeech, cb) {
        _word.random({ includePartOfSpeech : partOfSpeech, maxLength : 5 }, cb);
      }, pass(function (words) { cb(false, words.join('')); }, cb));
    },
    save : ['name', function ($, cb) {
      return store.insert('fs', { name : $.name, created : new Date().getTime() }, cb);
    }],
    channel : ['name', function ($, cb) {
      return io.createChannel($.name, cb);
    }]
  }, pass(function ($) {
    return res.redirect('/' + $.name);
  }, next));
});

/**
 * GETting a framespace renders the HTML
 */
app.get('/:fsName', function (req, res, next) {
  store.get('fs', { name : req.params.fsName }, pass(function (fss) {
    return fss.length === 1 ?
      res.render('index', { fs : fss[0] }) :
      res.sendStatus(fss.length ? 500 : 404);
  }, next));
});

/**
 * GETting the actions for a board.
 */
app.get('/:fsName/actions', function (req, res, next) {
  store.get('action', { fs : req.params.fsName }, pass(_.bind(res.send, res), next));
});

/**
 * POSTing a new action for a board
 */
app.post('/:fsName/actions', function (req, res, next) {
  var actions = _.isArray(req.body) ? req.body : [req.body];
  if (_.every(actions, validate.action)) {
    store.insert('action', _.map(actions, function (action) {
      return _.assign(action, { fs : req.params.fsName });
    }), pass(function () {
      res.sendStatus(200);
    }, next));
  } else {
    res.sendStatus(400);
  }
});

/**
 * GETting authorisation to use the realtime channel for a board
 */
app.get('/:fsName/channel/auth', function (req, res, next) {
  io.authorise(req.params.fsName, pass(_.bind(res.send, res), next));
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
