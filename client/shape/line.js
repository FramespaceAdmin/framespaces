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

Line.fromPoints = function (p1, p2) {
  return new Line({ x1 : p1.x, y1 : p1.y, x2 : p2.x, y2 : p2.y });
};

Line.prototype = Object.create(Shape.prototype);
Line.prototype.constructor = Line;

Line.prototype.computePoints = function () {
  return this.params.params;
};

Line.prototype.computeEnds = function () {
  return this.points;
};

Line.prototype.transform = function (m) {
  // Lines are implicitly rotated by their angle
  return (m || Matrix.IDENTITY).scale(this.extent).rotateFromVector(this.vector);
};

Line.prototype.mover = function (isEdge, cursor) {
  if (cursor.contains(this.ends[0])) {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy }); };
  } else if (cursor.contains(this.ends[1])) {
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
      points : require('./polyline').pointStr(_.initial(this.points).concat(that.points))
    });
  }
};

Line.prototype.pointOrder = function (axis) {
  var direction = Math.sign(this.vector[axis]);
  return function (p) {
    return direction * p[axis];
  };
}

Line.prototype.minus = function (that) {
  var points = _.sortBy(this.pointsMinus(that), this.pointOrder('x'), this.pointOrder('y'));
  return Line.linesBetween(points, function (i) { return i % 2 });
};

Line.linesBetween = function (points, filterIndex) {
  filterIndex || (filterIndex = _.identity);
  return _.reduce(points, function (lines, p2, i) {
    var p1 = points[i - 1];
    if (p1 && !p1.equals(p2) && filterIndex(i)) {
      lines.push(Line.fromPoints(p1, p2));
    }
    return lines;
  }, []);
};

module.exports = Line;
