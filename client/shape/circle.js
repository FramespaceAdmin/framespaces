var Shape = require('../shape'),
    Ellipse = require('./ellipse');

function Circle(attr) {
  Shape.call(this, 'circle', attr);
}

Circle.fromJSON = function (data) {
  return data.name === 'circle' && new Circle(data.attr);
};

Circle.of = function (e) {
  return e.node.nodeName === 'circle' && new Circle(Shape.strongAttr(e));
};

Circle.prototype = Object.create(Shape.prototype);
Circle.prototype.constructor = Circle;

Circle.prototype.computePoints = function () {
  return [this.params.params[0]]; // centre
};

Circle.prototype.computeBBox = function () {
  return Ellipse.computeBBox(this.points[0], this.attr.r, this.attr.r);
};

Circle.prototype.computeExtent = function () {
  return this.attr.r * 2; // diameter
};

Circle.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) {
    return function (dx, dy) { return this.delta({ cx : dx, cy : dy }); };
  } else {
    return function (dx, dy, x, y) {
      var c = new Point(this.attr.cx, this.attr.cy), p = new Point(x, y);
      return new Circle(_.assign(this.attr, { r : p.distanceFrom(c) }));
    };
  }
};

module.exports = Circle;
