var _ = require('lodash'),
    eventsIo = require('./events'),
    EventEmitter = require('events'),
    BrowserIo = require('./browser');

function LocalIo(name) {
  BrowserIo.call(this, name);
  this.events = new EventEmitter();
  this._publish('user.connected', this.user);
}

LocalIo.prototype = Object.create(BrowserIo.prototype);
LocalIo.prototype.constructor = LocalIo;

eventsIo.mixInto(LocalIo.prototype);

module.exports = LocalIo;
