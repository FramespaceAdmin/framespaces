var _ = require('lodash'),
    guid = require('../lib/guid'),
    EventEmitter = require('events'),
    Io = require('../client/io'),
    LocalIo = require('../client/io/local');

function MockIo(options) {
  if (!(this instanceof MockIo)) { return new MockIo(options); }
  options = _.defaults(options, {
    url : 'http://mock.io/fs',
    user : { id : guid() },
    events : new EventEmitter(),
    latency : 0
  });
  Io.call(this, options.url, options.user);
  _.assign(this, _.pick(options, 'events', 'latency', 'resources'));
  this._publish('user.connected', this.user);
}

MockIo.prototype = Object.create(Io.prototype);
MockIo.prototype.constructor = MockIo;

LocalIo.mixInto(MockIo.prototype);

module.exports = MockIo;
