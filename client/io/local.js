var _ = require('lodash'),
    eventsIo = require('./events'),
    browser = require('../browser'),
    EventEmitter = require('events'),
    Io = require('../io'),
    BrowserIo = require('./browser');

function LocalIo(name) {
  BrowserIo.call(this, name);
  var events = new EventEmitter();
  if (browser.localStorage) {
    browser.on('storage', _.bind(function (e) {
      var match = e.newValue && _.isString(e.key) && e.key.match(/(\w+):event:(\w+)/);
      match && match[1] === name && this.emit(match[2], JSON.parse(e.newValue));
    }, this));
    events.on('action', function (userId, action) {
      var key = name + ':event:action';
      browser.localStorage.setItem(key, JSON.stringify([userId, new Date().getTime(), action]));
      browser.localStorage.removeItem(key);
    });
  }
  this.events = events;
  this._publish('user.connected', this.user);
}

LocalIo.prototype = Object.create(BrowserIo.prototype);
LocalIo.prototype.constructor = LocalIo;

eventsIo.mixInto(LocalIo.prototype);

module.exports = LocalIo;
