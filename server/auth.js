var _ = require('lodash'),
    _jwt = require('jsonwebtoken'),
    log = require('../lib/log'),
    pass = require('pass-error'),
    guid = require('../lib/guid');

var JWT_SECRET = 'f962db97-49c7-4f16-bbba-3fee16b5fd4b';

function setReqUser(req, jwt, next) {
  _jwt.verify(jwt, JWT_SECRET, pass(function (user) {
    log.trace('%s: %s authorised for user %s', req.method, req.url, user.id);
    req.user = user;
    next();
  }, next));
}

function generateUser(req, res, next) {
  var user = { id : guid() };
  _jwt.sign(user, JWT_SECRET, {}, pass(function (jwt) {
    req.user = user;
    res.cookie('jwt', jwt);
    next();
  }, next));
}

/**
 * JSON Web Token cookies for web browser requests
 */
exports.cookie = function pageAuth(req, res, next) {
  if (req.cookies.jwt) {
    setReqUser(req, req.cookies.jwt, next);
  } else {
    generateUser(req, res, next);
  }
};
