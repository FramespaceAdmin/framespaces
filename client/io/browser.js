var Io = require('../io'),
    browser = require('../browser'),
    jwtDecode = require('jwt-decode');

/**
 * Base class for browser-based IO.
 * Assumes a browser implementation with a window and XHR.
 */
function BrowserIo(name) {
  this.jwt = browser.cookie('jwt');
  Io.call(this, name, jwtDecode(this.jwt));
}

BrowserIo.prototype = Object.create(Io.prototype);
BrowserIo.prototype.constructor = BrowserIo;

BrowserIo.prototype.close = function (err, cb) {
  this.emit('user.disconnected', [this.user.id, new Date().getTime(), err]);
  cb && cb(false); // Do this before moving the window
  err && browser.goto('error?cause=' + encodeURIComponent(err));
};

module.exports = BrowserIo;
