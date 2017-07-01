var _ = require('lodash'),
    guid = require('../lib/guid'),
    eventsIo = require('../client/io/events'),
    EventEmitter = require('events'),
    Io = require('../client/io');

function MockIo(name, options) {
  if (!(this instanceof MockIo)) { return new MockIo(name, options); }
  options = _.defaults(options, {
    url : 'http://mock.io/fs',
    user : { id : guid() },
    events : new EventEmitter(),
    latency : 0
  });
  Io.call(this, name, options.user);
  _.assign(this, _.pick(options, 'events', 'latency'));
  this._publish('user.connected', this.user);
}

MockIo.prototype = Object.create(Io.prototype);
MockIo.prototype.constructor = MockIo;

eventsIo.mixInto(MockIo.prototype);

module.exports = MockIo;
