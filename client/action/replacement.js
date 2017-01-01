var _ = require('lodash'),
    Action = require('../action'),
    Shape = require('../shape'),
    guid = require('../../lib/guid');

function Replacement(from, to, options) {
  Action.call(this, options);
  this.from = from;
  this.to = to;
}

Replacement.fromJSON = function (data) {
  return data.type === 'replacement' &&
    new Replacement(Shape.fromJSON(data.from), Shape.fromJSON(data.to), data);
};

Replacement.prototype = Object.create(Action.prototype);
Replacement.prototype.constructor = Replacement;

Replacement.prototype.do = function (picture) {
  picture.getElement(this.from.id).remove();
  return picture.changed(this.to.addTo(picture.paper));
};

Replacement.prototype.isOK = function (picture) {
  return picture.getElement(this.from.id);
};

Replacement.prototype.un = function () {
  return new Replacement(this.to, this.from, this.undoOptions());
};

Replacement.prototype.preview = function (picture, paper) {
  return picture.preview(paper, this.to);
};

Replacement.prototype.toJSON = function () {
  return _.assign(Action.prototype.toJSON.call(this), {
    type : 'replacement', from : this.from.toJSON(), to : this.to.toJSON()
  });
};

module.exports = Replacement;
