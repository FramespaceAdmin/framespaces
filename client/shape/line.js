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

Line.fromElement = function (e) {
  return Shape.elementName(e) === 'line' && new Line(Shape.elementAttr(e));
};

Line.fromPoints = function (p1, p2) {
  return new Line({ x1 : p1.x, y1 : p1.y, x2 : p2.x, y2 : p2.y });
};

Line.prototype = Object.create(Shape.prototype);
Line.prototype.constructor = Line;

Line.prototype.ATTR = Shape.prototype.ATTR.with({
  x1 : Number,
  y1 : Number,
  x2 : Number,
  y2 : Number
});

Line.prototype.computePoints = function () {
  return this.getParams().params;
};

Line.prototype.computeEnds = function () {
  return this.getPoints();
};

Line.prototype.translation = function (m) {
  return (m || Matrix.IDENTITY).translate(this.getEnds()[0].x, this.getEnds()[0].y);
};

Line.prototype.rotation = function (m) {
  return (m || Matrix.IDENTITY).rotateFromVector(this.vector);
};

Line.prototype.scale = function (m) {
  return (m || Matrix.IDENTITY).scale(this.getExtent());
};

Line.prototype.transform = function (matrix) {
  var ends = _.map(this.getEnds(), _.method('transform', matrix));
  return this.clone({ x1 : ends[0].x, y1 : ends[0].y, x2 : ends[1].x, y2 : ends[1].y });
};

Line.prototype.mover = function (isEdge, cursor) {
  if (cursor.contains(this.getEnds()[0])) {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy }); };
  } else if (cursor.contains(this.getEnds()[1])) {
    return function (dx, dy) { return this.delta({ x2 : dx, y2 : dy }); };
  } else {
    return function (dx, dy) { return this.delta({ x1 : dx, y1 : dy, x2 : dx, y2 : dy }); };
  }
};

Line.prototype.reverse = function () {
  return this.clone({
    x1 : this.attr.x2, y1 : this.attr.y2, x2 : this.attr.x1, y2 : this.attr.y1
  });
}

Line.prototype.add = function (that) {
  if (that instanceof Line || that instanceof require('./polyline')) {
    return this.cloneAs('polyline', {
      x1 : undefined, y1 : undefined, x2 : undefined, y2 : undefined,
      // Lose our second point
      points : require('./polyline').pointStr(_.initial(this.getPoints()).concat(that.getPoints()))
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
