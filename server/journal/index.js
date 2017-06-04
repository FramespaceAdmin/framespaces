var modules = require('../../lib/modules');

/**
 * Instantiate a Journal. This typically does nothing with persisted data;
 * use the methods to retrieve and persist data.
 * @param id the identity of the journal
 */
function Journal(id) {
  if (!(this instanceof Journal) || this.constructor === Journal) {
    return new (require(modules.journal))(id);
  }
  this.id = id;
}

/**
 * Fetch the top-level details of the journal object.
 * @param cb callback with error and journal details
 */
Journal.prototype.fetchDetails = function (cb/*(err, details)*/) {
  throw undefined;
};

/**
 * Fetch a journal's latest snapshot and the events since.
 * Each event has a 'timestamp' generated when it was added.
 * @see /lib/events for event and snapshot schemas
 * @param cb callback with error and events
 */
Journal.prototype.fetchEvents = function (cb/*(err, snapshot, [event])*/) {
  throw undefined;
};

/**
 * Persists details of this journal.
 * @param cb callback
 */
Journal.prototype.putDetails = function (details, cb/*(details, err)*/) {
  throw undefined;
};

/**
 * Adds and persists events to this journal based on the given data.
 * @param events the events to add
 * @param cb callback with error and removed count
 */
Journal.prototype.addEvent = function (data, timestamp, cb/*(err)*/) {
  throw undefined;
};

/**
 * Offer a snapshot to this journal. If a snapshot at the given timestamp is welcome,
 * a truthy nonce is returned to use with #addSnapshot. Implementations can choose
 * any strategy for accepting and maintaining snapshots; typically, another snapshot
 * in the same millisecond, or without an intermediate event, will not be welcome.
 * However, even in these cases the snapshot might be accepted to cross-check with
 * another client's view of the world, to mitigate against rogue clients.
 */
Journal.prototype.offerSnapshot = function (timestamp, cb/*(err, nonce)*/) {
  throw undefined;
};

/**
 * Add a snapshot using the nonce returned by #offerSnapshot. Note that even if the
 * nonce is valid the snapshot may still not actually be persisted, for example due to
 * concurrency with a more recent offer. In this case the return is success.
 */
Journal.prototype.addSnapshot = function (nonce, snapshot, cb/*(err)*/) {
  throw undefined;
};

module.exports = Journal;
