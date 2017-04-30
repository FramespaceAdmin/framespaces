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
    new Removal(Shape.fromJSON(data.from), data);
};

Removal.prototype = Object.create(Action.prototype);
Removal.prototype.constructor = Removal;

Removal.prototype.do = function (picture) {
  return picture.getElement(this.shape.id).remove();
};

Removal.prototype.isOK = function (picture) {
  return picture.getElement(this.shape.id);
};

Removal.prototype.un = function () {
  return new (require('./addition'))(this.shape, this.undoOptions());
};

Removal.prototype.toJSON = function () {
  return _.assign(Action.prototype.toJSON.call(this), {
    type : 'removal', from : this.shape.toJSON()
  });
};

Removal.prototype.andCollateral = function (picture) {
  var collateral = _.map(picture.inLinks(this.shape.id), function (e1) {
    return new Mutation(Shape.of(e1), picture.asUnlinkedShape(e1));
  });
  return _.isEmpty(collateral) ? this : new Batch(collateral.concat(this));
};

module.exports = Removal;
