var _ = require('lodash'),
    Action = require('../action'),
    Shape = require('../shape'),
    guid = require('../../lib/guid');

function Addition(shape, options) {
  Action.call(this, options);
  this.shape = shape.id ? shape : shape.clone({ id : guid() });
}

Addition.fromJSON = function (data) {
  return data.type === 'addition' &&
    new Addition(Shape.fromJSON(data.to), { id : data.id });
};

Addition.prototype = Object.create(Action.prototype);
Addition.prototype.constructor = Addition;

Addition.prototype.do = function (picture) {
  return picture.changed(this.shape.addTo(picture.paper));
};

Addition.prototype.isOK = function (picture) {
  return !picture.getElement(this.shape.id);
};

Addition.prototype.un = function () {
  return new (require('./removal'))(this.shape, this.undoOptions());
};

Addition.prototype.preview = function (picture, paper) {
  return picture.preview(paper, this.shape);
};

Addition.prototype.toJSON = function () {
  return { id : this.id, type : 'addition', to : this.shape.toJSON() };
};

module.exports = Addition;
