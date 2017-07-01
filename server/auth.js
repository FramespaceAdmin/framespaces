var _ = require('lodash'),
    _async = require('async'),
    _crypto = require('./crypto'),
    config = require('config'),
    log = require('../lib/log'),
    pass = require('pass-error'),
    guid = require('../lib/guid'),
    as = require('yavl');

var LOGIN = as({
  user : {
    id : String,
    email : String
  },
  timestamp : Number
});

function ERR_LOGIN_BAD_KEY() { return 'Cannot decipher login key.'; }
function ERR_LOGIN_BAD_ID() { return 'Login key does not match session.'; }
function ERR_LOGIN_TOO_LATE() { return 'Login validity period has elapsed.'; }
function ERR_LOGIN_NO_SESSION() { return 'Attempt to login with no current session.'; }
function ERR_AUTH_NO_COOKIE() { return 'No session cookie provided.'; }

function relayer(req, res, next) {
  return {
    success : function (user) {
      log.debug('%s: %s authorised for user %s', req.method, req.url, user.id);
      req.user = user;
      return next();
    },
    failure : function (err) {
      var body = _.isFunction(err) ?
        { err : err.name, comment : err() } :
        { err : 'ERR_AUTH_BAD_SESSION', comment : err };
      log.debug('%s: %s unauthorised with %s', req.method, req.url, body.err);
      return res.status(401).send(body);
    }
  };
}

function newCookie(user, res, cb) {
  log.debug('Generating anonymous cookie for user id %s', user.id);
  _crypto.sign(user, pass(function (jwt) {
    res.cookie('jwt', jwt);
    return cb(false, user);
  }, cb));
}

/**
 * Creates a login URL query object with a suitably mangled key
 */
exports.loginQuery = function (login, cb/*(err, query)*/) {
  _crypto.encrypt(LOGIN.validate(login), pass(function (key) {
    return cb(false, { login : key });
  }, cb));
};

/**
 * Route for API requests, JSON Web Token cookies mandatory 
 */
exports.cookie = function (req, res, next) {
  var relay = relayer(req, res, next);
  if (req.cookies.jwt) {
    _crypto.verify(req.cookies.jwt, pass(relay.success, relay.failure));
  } else {
    relay.failure(ERR_AUTH_NO_COOKIE);
  }
};

/**
 * Route for framespace GET requests.
 * Sets the response cookie if no request cookie exists, or the request
 * contains a valid login key.
 */
exports.setCookie = function (req, res, next) {
  var relay = relayer(req, res, next);
  if (req.cookies.jwt) {
    _crypto.verify(req.cookies.jwt, pass(function (user) {
      if (req.query.login) {
        _crypto.decrypt(req.query.login, pass(function (login) {
          if (!LOGIN.matches(login)) {
            relay.failure(ERR_LOGIN_BAD_KEY);
          } else if (login.user.id !== user.id) {
            relay.failure(ERR_LOGIN_BAD_ID);
          } else if (new Date().getTime() > login.timestamp + config.get('login.timeout')) {
            relay.failure(ERR_LOGIN_TOO_LATE);
          } else {
            newCookie(_.assign(user, login.user), res, pass(function () {
              res.redirect(303/*See Other*/, req.path);
            }, relay.failure));
          }
        }, relay.failure));
      } else {
        relay.success(user);
      }
    }, relay.failure));
  } else {
    if (req.query.login) {
      relay.failure(ERR_LOGIN_NO_SESSION);
    } else {
      newCookie({ id : guid() }, res, pass(relay.success, relay.failure));
    }
  }
};
