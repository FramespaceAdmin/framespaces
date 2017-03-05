var Journal = require('../journal');

function MemoryJournal() {
  Journal.call(this);
  this.nss = {};
}

MemoryJournal.prototype = Object.create(Journal.prototype);
MemoryJournal.prototype.constructor = MemoryJournal;

MemoryJournal.prototype.fetchEvents = function (ns) {
  return this.nss[ns] || [];
};

MemoryJournal.prototype.addEvent = function (ns, event) {
  return (this.nss[ns] || (this.nss[ns] = [])).push(event);
};

module.exports = MemoryJournal;
