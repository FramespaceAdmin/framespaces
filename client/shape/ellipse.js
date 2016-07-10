var Shape = require('../shape');

function Ellipse(attr) {
  Shape.call(this, 'ellipse', attr);
}

Ellipse.fromJSON = function (data) {
  return data.name === 'ellipse' && new Ellipse(data.attr);
};

Ellipse.of = function (e) {
  return e.node.nodeName === 'ellipse' && new Ellipse(Shape.strongAttr(e));
};

Ellipse.prototype = Object.create(Shape.prototype);
Ellipse.prototype.constructor = Ellipse;

Ellipse.prototype.computePoints = function () {
  return [this.params.params[0]]; // centre
};

Ellipse.prototype.computeBBox = function () {
  return Ellipse.computeBBox(this.points[0], this.attr.rx, this.attr.ry);
};

Ellipse.computeBBox = function (c, rx, ry) {
  return { c : c, x : c.x - rx, y : c.y - ry, width : rx*2, height : ry*2 };
};

Ellipse.prototype.computeExtent = function () {
  return this.attr.rx + this.attr.ry; // diameter-ish
};

module.exports = Ellipse;
