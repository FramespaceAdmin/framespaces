var Shape = require('../shape'),
    Polygon = require('./polygon'),
    Point = require('kld-affine').Point2D;

function Rect(attr) {
  Shape.call(this, 'rect', attr);
}

Rect.fromJSON = function (data) {
  return data.name === 'rect' && new Rect(data.attr);
};

Rect.fromElement = function (e) {
  return Shape.elementName(e) === 'rect' && new Rect(Shape.elementAttr(e));
};

Rect.prototype = Object.create(Polygon.prototype);
Rect.prototype.constructor = Rect;

Rect.prototype.ATTR = Shape.prototype.ATTR.with({
  x : Number,
  y : Number,
  width : Number,
  height : Number
});

Rect.prototype.computePoints = Shape.prototype.computePoints;

Rect.prototype.transform = function (matrix) {
  var p = new Point(this.attr.x, this.attr.y).transform(matrix), s = matrix.getScale();
  return this.clone({
    x : p.x,
    y : p.y,
    width : this.attr.width * s.scaleX,
    height : this.attr.height * s.scaleY
  });
};

Rect.prototype.contains = function (that) {
  if (that instanceof Shape) {
    return Shape.prototype.contains.call(this, that);
  }
  return that.x >= this.bbox.x && that.x <= this.bbox.x2 &&
         that.y >= this.bbox.y && that.y <= this.bbox.y2;
}

Rect.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) { // Body
    return function (dx, dy) { return this.delta({ x : dx, y : dy }); };
  } else if (cursor.contains(new Point(this.bbox.x, this.bbox.y))) { // Top left corner
    return function (dx, dy) { return this.delta({ x : dx, y : dy, width : -dx, height : -dy }); };
  } else if (cursor.contains(new Point(this.bbox.x2, this.bbox.y))) { // Top right corner
    return function (dx, dy) { return this.delta({ y : dy, width : dx, height : -dy }); };
  } else if (cursor.contains(new Point(this.bbox.x, this.bbox.y2))) { // Bottom left corner
    return function (dx, dy) { return this.delta({ x : dx, width : -dx, height : dy }); };
  } else if (cursor.contains(new Point(this.bbox.x2, this.bbox.y2))) { // Bottom right corner
    return function (dx, dy) { return this.delta({ width : dx, height : dy }); };
  } else if (cursor.contains(new Point(this.bbox.x, cursor.bbox.c.y))) { // Left side
    return function (dx, dy) { return this.delta({ x : dx, width : -dx }); };
  } else if (cursor.contains(new Point(cursor.bbox.c.x, this.bbox.y))) { // Top side
    return function (dx, dy) { return this.delta({ y : dy, height : -dy }); };
  } else if (cursor.contains(new Point(this.bbox.x2, cursor.bbox.c.y))) { // Right side
    return function (dx, dy) { return this.delta({ width : dx }); };
  } else if (cursor.contains(new Point(cursor.bbox.c.x, this.bbox.y2))) { // Bottom side
    return function (dx, dy) { return this.delta({ height : dy }); };
  }
};

module.exports = Rect;
