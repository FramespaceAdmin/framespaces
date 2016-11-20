var _ = require('lodash'),
    Action = require('../action'),
    Batch = require('./batch'),
    Mutation = require('./mutation'),
    Shape = require('../shape');

function Removal(shape, options) {
  Action.call(this, options);
  this.shape = shape;
}

Removal.fromJSON = function (data) {
  return data.type === 'removal' &&
    new Removal(data.from, { id : data.id, collateral : false });
};

Removal.prototype = Object.create(Action.prototype);
Removal.prototype.constructor = Removal;

Removal.prototype.do = function (picture) {
  return picture.changed(picture.getElement(this.shape.id).remove());
};

Removal.prototype.isOK = function (picture) {
  return picture.getElement(this.shape.id);
};

Removal.prototype.un = function () {
  return new (require('./addition'))(this.shape, this.undoOptions());
};

Removal.prototype.toJSON = function () {
  return { id : this.id, type : 'removal', from : this.shape.toJSON() };
};

Removal.prototype.andCollateral = function (picture) {
  return this.and(_.map(picture.inLinks(this.shape.id), function (e1) {
    return new Mutation(Shape.of(e1), picture.asUnlinkedShape(e1));
  }));
};

module.exports = Removal;
