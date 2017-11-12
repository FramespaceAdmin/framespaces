var modules = require('../../lib/modules');

function Io(server, app) {
  if (!(this instanceof Io) || this.constructor === Io) {
    return new (require('../' + modules.io))(server, app);
  }
}

/**
 * Create a channel for io.
 * @param name channel name
 * @param journal a journal for adding events
 * @param cb callback with error and channel object (implementation specific)
 */
Io.prototype.createChannel = function (name, journal, cb/*(err, channel)*/) {
  throw undefined;
};

/**
 * Publish to the io channel.
 * @param userId user publishing
 * @param eventName channel event name
 * @param data... data to publish
 * @param cb optional callback with error
 */
Io.prototype.publish = function (name, eventName, userId, data/*...*/, cb/*(err)*/) {
  throw undefined;
};

/**
 * Authorise a channel according to some internal means
 * @param name channel name
 * @param cb callback with error and authorisation (implementation specific)
 */
Io.prototype.authorise = function (name, userId, cb/*(err, authorisation)*/) {
  throw undefined;
};

module.exports = Io;
