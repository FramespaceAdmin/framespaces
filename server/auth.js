var _ = require('lodash'),
    _jwt = require('jsonwebtoken'),
    log = require('../lib/log'),
    pass = require('pass-error'),
    guid = require('../lib/guid');

function setReqUser(req, jwt, next) {
  _jwt.verify(jwt, process.env.FS_JWT_SECRET, pass(function (user) {
    log.trace('%s: %s authorised for user %s', req.method, req.url, user.id);
    req.user = user;
    next();
  }, next));
}

function generateUser(req, res, next) {
  var user = { id : guid() };
  _jwt.sign(user, process.env.FS_JWT_SECRET, {}, pass(function (jwt) {
    req.user = user;
    res.cookie('jwt', jwt);
    next();
  }, next));
}

/**
 * JSON Web Token cookies mandatory for API requests
 */
exports.cookie = function (req, res, next) {
  if (req.cookies.jwt) {
    setReqUser(req, req.cookies.jwt, next);
  } else {
    res.sendStatus(401);
  }
};

exports.setCookie = function (req, res, next) {
  if (req.cookies.jwt) {
    setReqUser(req, req.cookies.jwt, next);
  } else {
    generateUser(req, res, next);
  }
};
