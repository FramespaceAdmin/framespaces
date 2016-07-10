var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('./polyline'),
    Vector = require('kld-affine').Vector2D,
    Matrix = require('kld-affine').Matrix2D;

function Line(attr) {
  Shape.call(this, 'line', attr);
}

Line.fromJSON = function (data) {
  return data.name === 'line' && new Line(data.attr);
};

Line.of = function (e) {
  return e.node.nodeName === 'line' && new Line(Shape.strongAttr(e));
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

Line.prototype.reverse = function () {
  return this.cloneAs(Line, {
    x1 : this.attr.x2, y1 : this.attr.y2, x2 : this.attr.x1, y2 : this.attr.y1
  });
}

Line.prototype.add = function (that) {
  if (that instanceof Line || that instanceof Polyline) {
    return this.cloneAs(Polyline, {
      x1 : undefined, y1 : undefined, x2 : undefined, y2 : undefined,
      // Lose our second point
      points : Shape.pointStr(_.initial(this.points).concat(that.points))
    });
  }
};

module.exports = Line;
