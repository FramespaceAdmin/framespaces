
/**
 * Instantiate a Journal. This typically does nothing with persisted data;
 * use the methods to retrieve and persist data.
 * @param id the identity of the journal
 */
function Journal(id) {
  if (this.constructor === Journal) {
    throw new Error("Can't instantiate abstract class!");
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
 * Fetch a journal's events. Each event has a 'timestamp' generated when it was added.
 * @param cb callback with error and events
 */
Journal.prototype.fetchEvents = function (cb/*(err, [event])*/) {
  throw undefined;
};

/**
 * Persists details of this journal.
 * @param cb callback
 */
Journal.prototype.putDetails = function (details, cb/*(err)*/) {
  throw undefined;
};

/**
 * Adds and persists events to this journal.
 * @param events the events to add
 * @param cb callback with error and removed count
 */
Journal.prototype.addEvent = function (event, cb/*(err)*/) {
  throw undefined;
};

module.exports = Journal;
