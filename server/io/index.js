
function Io() {
}

/**
 * Create a channel for io.
 * @param name channel name
 * @param cb callback with error and channel object (implementation specific)
 */
Io.prototype.createChannel = function (name, cb/*(err, channel)*/) {
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
