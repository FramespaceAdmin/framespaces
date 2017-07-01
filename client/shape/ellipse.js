var Shape = require('../shape'),
    Point = require('kld-affine').Point2D;

function Ellipse(attr) {
  Shape.call(this, 'ellipse', attr);
}

Ellipse.fromJSON = function (data) {
  return data.name === 'ellipse' && new Ellipse(data.attr);
};

Ellipse.fromElement = function (e) {
  return Shape.elementName(e) === 'ellipse' && new Ellipse(Shape.elementAttr(e));
};

Ellipse.prototype = Object.create(Shape.prototype);
Ellipse.prototype.constructor = Ellipse;

Ellipse.prototype.ATTR = Shape.prototype.ATTR.with({
  cx : Number,
  cy : Number,
  rx : Number,
  ry : Number
});

Ellipse.prototype.computePoints = function () {
  return Ellipse.computePoints(this.attr.cx, this.attr.cy, this.attr.rx, this.attr.ry);
};

Ellipse.computePoints = function (cx, cy, rx, ry) {
  // Compass points
  return [
    new Point(cx, cy - ry),
    new Point(cx + rx, cy),
    new Point(cx, cy + ry),
    new Point(cx - rx, cy)
  ];
};

Ellipse.prototype.computeBBox = function () {
  return Ellipse.computeBBox(this.attr.cx, this.attr.cy, this.attr.rx, this.attr.ry);
};

Ellipse.computeBBox = function (cx, cy, rx, ry) {
  return { cx : cx, cy : cy, x : cx - rx, y : cy - ry, width : rx*2, height : ry*2 };
};

Ellipse.prototype.computeExtent = function () {
  return this.attr.rx + this.attr.ry; // diameter-ish
};

// TODO: contains, mover, minus

module.exports = Ellipse;
