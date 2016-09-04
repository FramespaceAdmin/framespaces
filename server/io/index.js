
function Io() {
}

/**
 * Create a channel for io.
 * @param name channel name
 * @param cb callback with error and channel object (implementation specific)
 */
Io.prototype.createChannel = function (name, cb/*(err, channel)*/) {
  throw new Error('Calling abstract class');
};

/**
 * Authorise a channel according to some internal means
 * @param name channel name
 * @param cb callback with error and authorisation (implementation specific)
 */
Io.prototype.authorise = function (name, cb/*(err, authorisation)*/) {
  throw new Error('Calling abstract class');
};

module.exports = Io;
