var _ = require('lodash'),
    as = require('yavl'),
    Shape = require('../shape'),
    Line = require('./line'),
    _kld = require('kld-affine'),
    Point = _kld.Point2D,
    Vector = _kld.Vector2D,
    vector = Vector.fromPoints,
    rotate = _.bind(_kld.Matrix2D.prototype.rotate, _kld.Matrix2D.IDENTITY);

function end(shape, other, angle) {
  // Throw out a ray from the shape centre, along the specified angle from the centre-centre line.
  var cc = vector(shape.bbox.c, other.bbox.c),
      ray = cc.transform(rotate(angle || 0)).unit().multiply(shape.extent),
      intersects = Line.fromPoints(shape.bbox.c, shape.bbox.c.add(ray)).intersect(shape);
  // Point is the ray intersect
  return Shape.closest(intersects, other.bbox.c) || shape.bbox.c;
}

function Linkline(attr) {
  // Allow attr to not have its start and end points specified
  Line.call(this, Shape.deltaAttr(_.defaults(attr, {
    x1 : 0, y1 : 0, x2 : 0, y2 : 0
  }), { class : 'link' }));
}

Linkline.fromJSON = function (data) {
  return data.name === 'line' && Shape.hasClass(data.attr, 'link') && new Linkline(data.attr);
};

Linkline.fromElement = function (e) {
  return Shape.elementName(e) === 'line' && (function (attr) {
    return Shape.hasClass(attr, 'link') && new Linkline(attr);
  })(Shape.elementAttr(e));
};

Linkline.angle = function (shape, other, end) {
  return vector(shape.bbox.c, other.bbox.c).angleBetween(vector(shape.bbox.c, end));
};

Linkline.prototype = Object.create(Line.prototype);
Linkline.prototype.constructor = Linkline;

Linkline.prototype.ATTR = Line.prototype.ATTR.with({
  from : String,
  to : String,
  a1 : as(undefined, Number),
  a2 : as(undefined, Number)
});

Linkline.prototype.link = function (from, to) {
  var p1 = end(from, to, this.attr.a1), p2 = end(to, from, this.attr.a2);
  return this.clone({
    x1 : p1.x, y1 : p1.y,
    x2 : p2.x, y2 : p2.y,
    from : from.attr.id,
    to : to.attr.id
  });
};

Linkline.prototype.mover = function (isEdge, cursor, getShapeById) {
  var from = getShapeById(this.attr.from), to = getShapeById(this.attr.to);
  if (cursor.contains(this.ends[0])) {
    return function (dx, dy, x, y) {
      return this.clone({ a1 : Linkline.angle(from, to, new Point(x, y)) }).link(from, to);
    };
  } else if (cursor.contains(this.ends[1])) {
    return function (dx, dy, x, y) {
      return this.clone({ a2 : Linkline.angle(to, from, new Point(x, y)) }).link(from, to);
    };
  } else {
    return function (dx, dy) {
      var d = new Vector(dx, dy);
      return this.clone({
        a1 : Linkline.angle(from, to, this.ends[0].add(d)),
        a2 : Linkline.angle(to, from, this.ends[1].add(d))
      }).link(from, to);
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
