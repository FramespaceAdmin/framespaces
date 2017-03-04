var _ = require('lodash'),
    config = require('config'),
    log = require('../lib/log'),
    express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    validate = require('../lib/validate'),
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
  res.render('index', {
    fs : { name : 'anonymouse' },
    config : _.set(_.pick(config, 'log'), 'modules.io', 'local' ), // Local IO for anonymous fs
    resources : { actions : [] } // Placeholder for a welcome message
  })
});

/**
 * GETting a new framespace name
 */
app.get('/fsName', auth.cookie, function (req, res, next) {
  return _async.concatSeries(['adjective', 'noun'], function (partOfSpeech, cb) {
    _word.random({ includePartOfSpeech : partOfSpeech, maxLength : 5 }, cb);
  }, pass(function (words) {
    res.send(words.join(''));
  }, next));
});

/**
 * POSTing a framespace creates it
 */
app.post('/', auth.cookie, function (req, res, next) {
  var fs = req.body;
  validate.fs(fs, pass(function () {
    Journal(fs.name).putDetails(fs, pass(function (fs) {
      io.createChannel(fs.name, Journal, pass(function () {
        res.status(201).location('/' + fs.name).send(fs);
      }, next));
    }, next));
  }, next));
});

/**
 * GETting a framespace renders the HTML
 * TODO ... unless the framespace is private.
 */
app.get('/:fsName', auth.cookie, function (req, res, next) {
  Journal(req.params.fsName).fetchDetails(pass(function (fs) {
    return fs ? res.render('index', {
      fs : fs,
      config : _.pick(config, 'log', 'modules.io')
    }) : res.sendStatus(404);
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
