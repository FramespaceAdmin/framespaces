var Io = require('../io'),
    getCookie = require('js-cookie').get,
    jwtDecode = require('jwt-decode'),
    request = require('request');

/**
 * Base class for browser-based IO.
 * Assumes a browser implementation with a window and XHR.
 */
function BrowserIo() {
  this.jwt = getCookie('jwt');
  Io.call(this, window.location.href, jwtDecode(this.jwt));
}

BrowserIo.prototype = Object.create(Io.prototype);
BrowserIo.prototype.constructor = BrowserIo;

BrowserIo.prototype.get = function (path, cb/*(err, body)*/) {
  request({ url : this.url(path), json : true }, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      cb(err || body);
    } else {
      cb(false, body);
    }
  });
};

BrowserIo.prototype.close = function (err, cb) {
  this.emit('user.disconnected', [this.user.id, err]);
  cb && cb(false); // Do this before moving the window
  err && (window.location = this.url('error?cause=' + encodeURIComponent(err)));
};

module.exports = BrowserIo;
