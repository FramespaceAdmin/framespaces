var _ = require('lodash'),
    Shape = require('../shape'),
    Line = require('./line'),
    _kld = require('kld-affine'),
    Point = _kld.Point2D,
    Vector = _kld.Vector2D,
    vector = Vector.fromPoints,
    rotate = _.bind(_kld.Matrix2D.prototype.rotate, _kld.Matrix2D.IDENTITY);

function closest(points, toPoint) {
  return _.minBy(points, _.bind(toPoint.distanceFrom, toPoint));
}

function end(shape, other, angle) {
  // Throw out a ray from the shape centre, along the specified angle from the centre-centre line.
  var cc = vector(shape.bbox.c, other.bbox.c),
      ray = cc.transform(rotate(angle || 0)).unit().multiply(shape.extent),
      intersects = Line.fromPoints(shape.bbox.c, shape.bbox.c.add(ray)).intersect(shape);
  // Point is the ray intersect
  return closest(intersects, other.bbox.c) || shape.bbox.c;
}

function angle(shape, other, end) {
  return vector(shape.bbox.c, other.bbox.c).angleBetween(vector(shape.bbox.c, end));
}

function Linkline(line, from, to) {
  var p1 = end(from, to, line.attr.a1), p2 = end(to, from, line.attr.a2);
  Line.call(this, line.clone({
    x1 : p1.x, y1 : p1.y,
    x2 : p2.x, y2 : p2.y,
    from : from.attr.id,
    to : to.attr.id,
    class : 'link'
  }).attr);
}

// Duplicate the line constructor for private use (see Linkline.fromJSON & Linkline.of)
function _Linkline() {
  Line.apply(this, arguments);
}

Linkline.fromJSON = function (data) {
  return data.name === 'line' && Shape.hasClass(data.attr, 'link') && new _Linkline(data.attr);
};

Linkline.of = function (e) {
  return e.node.nodeName === 'line' && e.hasClass('link') && new _Linkline(Shape.strongAttr(e));
};

Linkline.prototype = _Linkline.prototype = Object.create(Line.prototype);
Linkline.prototype.constructor = Linkline;

Linkline.prototype.clone = function () {
  return this.cloneAs.apply(this, [_Linkline].concat(_.toArray(arguments)));
};

Linkline.prototype.delta = function (dAttr) {
  return new _Linkline(this.deltaAttr(dAttr));
};

Linkline.prototype.mover = function (isEdge, cursor, getShapeById) {
  var from = getShapeById(this.attr.from), to = getShapeById(this.attr.to);
  if (cursor.contains(this.ends[0])) {
    return function (dx, dy, x, y) {
      return new Linkline(this.clone({ a1 : angle(from, to, new Point(x, y)) }), from, to);
    };
  } else if (cursor.contains(this.ends[1])) {
    return function (dx, dy, x, y) {
      return new Linkline(this.clone({ a2 : angle(to, from, new Point(x, y)) }), from, to);
    };
  } else {
    return function (dx, dy) {
      var d = new Vector(dx, dy);
      return new Linkline(this.clone({
        a1 : angle(from, to, this.ends[0].add(d)),
        a2 : angle(to, from, this.ends[1].add(d))
      }), from, to);
    };
  }
};

Linkline.prototype.reverse = function () {
  return this.clone({
    x1 : this.attr.x2, y1 : this.attr.y2, x2 : this.attr.x1, y2 : this.attr.y1,
    from : this.attr.to, to : this.attr.from
  });
};

Linkline.prototype.add = null; // Links cannot be added to

module.exports = Linkline;
