var _ = require('lodash')
    _url = require('url'),
    request = require('xhr'),
    join = require('url-join'),
    url = _url.parse(window.location.href);

exports.errorPage = function (err) {
  if (err) {
    window.location = exports.url('error?cause=' + encodeURIComponent(err));
  }
}

exports.name = _.find(url.pathname.split(/[/?]/g));

exports.url = function () {
  return join.apply(null, [_url.format({
    protocol : url.protocol,
    auth : url.auth,
    host : url.host
  }), exports.name].concat(_.toArray(arguments)));
};

function httpCb(cb) {
  return function (err, res, body) {
    if (err || res.statusCode !== 200) {
      cb(err || body);
    } else {
      cb(false, body);
    }
  };
}

exports.post = function (path, body, cb/*(err, body)*/) {
  request.post({ url : exports.url(path), json : body }, httpCb(cb));
};

exports.get = function (path, cb/*(err, body)*/) {
  request({ url : exports.url(path), json : true }, httpCb(cb));
};
