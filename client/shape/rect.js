var Shape = require('../shape'),
    Point = require('kld-affine').Point2D;

function Rect(attr) {
  Shape.call(this, 'rect', attr);
}

Rect.fromJSON = function (data) {
  return data.name === 'rect' && new Rect(data.attr);
};

Rect.of = function (e) {
  return e.node.nodeName === 'rect' && new Rect(Shape.strongAttr(e));
};

Rect.prototype = Object.create(Shape.prototype);
Rect.prototype.constructor = Rect;

Rect.prototype.contains = function (point) {
  return point.x >= this.bbox.x && point.x <= this.bbox.x2 &&
         point.y >= this.bbox.y && point.y <= this.bbox.y2;
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
