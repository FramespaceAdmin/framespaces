var storageAvailable = require('storage-available');

function Journal() {
  if (!(this instanceof Journal) || this.constructor === Journal) {
    if (storageAvailable('localStorage')) {
      return new (require('./local'))();
    } else {
      return new (require('./memory'))();
    }
  }
}

Journal.prototype.addEvent = function (ns, event) {
  throw undefined;
};

Journal.prototype.fetchEvents = function (ns) {
  throw undefined;
};

module.exports = Journal;
