var Shape = require('../shape'),
    Vector = require('kld-affine').Vector2D,
    Matrix = require('kld-affine').Matrix2D;

function Line(attr) {
  Shape.call(this, 'line', attr);
}

Line.fromJSON = function (data) {
  return data.name === 'line' && new Line(data.attr);
};

Line.of = function (e) {
  return e.node.nodeName === 'line' && new Line(Shape.nodeAttr(e));
};

Line.prototype = Object.create(Shape.prototype);
Line.prototype.constructor = Line;

Line.prototype.computePoints = function () {
  return this.params.params;
};

Line.prototype.transform = function (m) {
  // Lines are implicitly rotated by their angle
  return (m || Matrix.IDENTITY).scale(this.extent)
    .rotateFromVector(Vector.fromPoints(_.first(this.points), _.last(this.points)));
};

Line.prototype.mover = function (isEdge, cursor) {
  if (cursor.c.distanceFrom(_.first(this.points)) < cursor.r) {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy }); };
  } else if (cursor.c.distanceFrom(_.last(this.points)) < cursor.r) {
    return function (dx, dy) { return this.delta({ x2 : dx, y2 : dy }); };
  } else {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy, x2 : dx, y2 : dy }); };
  }
};

module.exports = Line;
