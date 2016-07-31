var _ = require('lodash'),
    Shape = require('../shape'),
    Vector = require('kld-affine').Vector2D,
    Matrix = require('kld-affine').Matrix2D;

function Line(attr) {
  Shape.call(this, 'line', attr);
  this.vector = new Vector(this.attr.x2 - this.attr.x1, this.attr.y2 - this.attr.y1);
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
  return (m || Matrix.IDENTITY).scale(this.extent).rotateFromVector(this.vector);
};

Line.prototype.mover = function (isEdge, cursor) {
  if (cursor.contains(_.first(this.points))) {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy }); };
  } else if (cursor.contains(_.last(this.points))) {
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
  if (that instanceof Line || that instanceof require('./polyline')) {
    return this.cloneAs(require('./polyline'), {
      x1 : undefined, y1 : undefined, x2 : undefined, y2 : undefined,
      // Lose our second point
      points : Shape.pointStr(_.initial(this.points).concat(that.points))
    });
  }
};

Line.prototype.pointOrder = function (axis) {
  var direction = Math.sign(this.vector[axis]);
  return function (p) {
    return direction * p[axis];
  };
}

Line.prototype.erase = function (cursor) {
  var points = this.points.concat(this.intersect(cursor));
  points = _.sortBy(points, this.pointOrder('x'), this.pointOrder('y'));
  points = cursor.contains(this.points[0]) ? _.tail(points) : points;
  return Line.linesBetween(points, function (i) { return i % 2 });
};

Line.linesBetween = function (points, filterIndex) {
  filterIndex || (filterIndex = _.identity);
  return _.reduce(points, function (lines, p, i) {
    if (i && filterIndex(i)) {
      lines.push(new Line({ x1 : points[i - 1].x, y1 : points[i - 1].y, x2 : p.x, y2 : p.y }));
    }
    return lines;
  }, []);
};

module.exports = Line;
