var _ = require('lodash')
    _url = require('url'),
    join = require('url-join'),
    url = _url.parse(window.location.href);

exports.name = _.find(url.pathname.split(/[/?]/g));

exports.append = function () {
  return join.apply(null, [_url.format({
    protocol : url.protocol,
    auth : url.auth,
    host : url.host
  }), exports.name].concat(_.toArray(arguments)));
};
