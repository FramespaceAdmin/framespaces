var _async = require('async'),
    Journal = require('../journal'),
    taffy = require('taffydb').taffy;

function TaffyJournal() {
  Journal.call(this);
  this.typeData = { /*type : taffy()*/ };
}

TaffyJournal.prototype = Object.create(Journal.prototype);
TaffyJournal.prototype.constructor = TaffyJournal;

TaffyJournal.prototype.data = function (type) {
  return this.typeData[type] || (this.typeData[type] = taffy());
};

TaffyJournal.prototype.get = _async.asyncify(function (type, filter) {
  return this.data(type)(filter).get();
});

TaffyJournal.prototype.insert = _async.asyncify(function (type, data) {
  return this.data(type).insert(data);
});

TaffyJournal.prototype.remove = _async.asyncify(function (type, filter) {
  return this.data(type)(filter).remove();
});

module.exports = TaffyJournal;
