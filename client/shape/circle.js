var _ = require('lodash'),
    Vector = require('kld-affine').Vector2D,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Ellipse = require('./ellipse'),
    Arc = require('./arc');

var DOWN = new Vector(0, 1);

function Circle(attr) {
  Shape.call(this, 'circle', attr);
}

Circle.fromJSON = function (data) {
  return data.name === 'circle' && new Circle(data.attr);
};

Circle.fromElement = function (e) {
  return Shape.elementName(e) === 'circle' && new Circle(Shape.elementAttr(e));
};

Circle.prototype = Object.create(Shape.prototype);
Circle.prototype.constructor = Circle;

Circle.prototype.ATTR = Shape.prototype.ATTR.with({
  cx : Number,
  cy : Number,
  r : Number
});

Circle.prototype.computePoints = function () {
  return Ellipse.computePoints(this.attr.cx, this.attr.cy, this.attr.r, this.attr.r);
};

Circle.prototype.computeBBox = function () {
  return Ellipse.computeBBox(this.attr.cx, this.attr.cy, this.attr.r, this.attr.r);
};

Circle.prototype.computeExtent = function () {
  return this.attr.r * 2; // diameter
};

Circle.prototype.contains = function (that) {
  if (that instanceof Shape) {
    return Shape.prototype.contains.call(this, that);
  }
  return that.distanceFrom(this.bbox.c) <= this.attr.r;
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

Circle.prototype.minus = function (that) {
  // Ordering clockwise from top-dead-centre
  var centre = this.bbox.c, tdc = new Point(this.attr.cx, this.attr.cy - this.attr.r);
  var points = _.sortBy(this.intersect(that), function (p) {
    var angle = DOWN.angleBetween(Vector.fromPoints(centre, p));
    // TDC needs to be ordered first
    return angle === Math.PI ? -Math.PI : angle;
  });
  if (points.length || that.contains(tdc)) {
    // If TDC is outside that shape, rotate the array by one
    if (points.length && !that.contains(tdc)) {
      points = _.tail(points).concat(_.first(points));
    }
    return Arc.arcsBetween(points, {
      rx : this.attr.r,
      ry : this.attr.r,
      largeArcFlag : true,
      sweepFlag : true
    }, this.bbox.c);
  } else {
    return [this]; // not overlapping, no change
  }
};

module.exports = Circle;
