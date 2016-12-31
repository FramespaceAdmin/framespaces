var Io = require('../io'),
    cookies = require('js-cookie'),
    jwtDecode = require('jwt-decode'),
    request = require('xhr');

/**
 * Base class for browser-based IO.
 * Assumes a browser implementation with a window and XHR.
 */
function BrowserIo() {
  this.jwt = cookies.get('jwt');
  Io.call(this, window.location.href, jwtDecode(this.jwt));
}

BrowserIo.prototype = Object.create(Io.prototype);
BrowserIo.prototype.constructor = BrowserIo;

BrowserIo.prototype.get = function (path, cb/*(err, body)*/) {
  request({ url : this.url(path), json : true }, function () {
    return function (err, res, body) {
      if (err || res.statusCode !== 200) {
        cb(err || body);
      } else {
        cb(false, body);
      }
    };
  });
};

BrowserIo.prototype.close = function (err) {
  err && (window.location = this.url('error?cause=' + encodeURIComponent(err)));
};

module.exports = BrowserIo;
