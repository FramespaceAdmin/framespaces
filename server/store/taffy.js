var _async = require('async'),
    Store = require('../store'),
    taffy = require('taffydb').taffy;

function TaffyStore() {
  Store.call(this);
  this.typeData = { /*type : taffy()*/ };
}

TaffyStore.prototype = Object.create(Store.prototype);
TaffyStore.prototype.constructor = TaffyStore;

TaffyStore.prototype.data = function (type) {
  return this.typeData[type] || (this.typeData[type] = taffy());
};

TaffyStore.prototype.get = _async.asyncify(function (type, filter) {
  return this.data(type)(filter).get();
});

TaffyStore.prototype.insert = _async.asyncify(function (type, data) {
  return this.data(type).insert(data);
});

TaffyStore.prototype.remove = _async.asyncify(function (type, filter) {
  return this.data(type)(filter).remove();
});

module.exports = TaffyStore;
