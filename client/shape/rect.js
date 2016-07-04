var Shape = require('../shape');

function Rect(attr) {
  Shape.call(this, 'rect', attr);
}

Rect.fromJSON = function (data) {
  return data.name === 'rect' && new Rect(data.attr);
};

Rect.of = function (e) {
  return e.node.nodeName === 'rect' && new Rect(Shape.nodeAttr(e));
};

Rect.prototype = Object.create(Shape.prototype);
Rect.prototype.constructor = Rect;

Rect.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) { // Body
    return function (dx, dy) { return this.delta({ x : dx, y : dy }); };
  } else if (cursor.c.distanceFrom(new Point(this.bbox.x, this.bbox.y)) < cursor.r) { // Top left corner
    return function (dx, dy) { return this.delta({ x : dx, y : dy, width : -dx, height : -dy }); };
  } else if (cursor.c.distanceFrom(new Point(this.bbox.x2, this.bbox.y)) < cursor.r) { // Top right corner
    return function (dx, dy) { return this.delta({ y : dy, width : dx, height : -dy }); };
  } else if (cursor.c.distanceFrom(new Point(this.bbox.x, this.bbox.y2)) < cursor.r) { // Bottom left corner
    return function (dx, dy) { return this.delta({ x : dx, width : -dx, height : dy }); };
  } else if (cursor.c.distanceFrom(new Point(this.bbox.x2, this.bbox.y2)) < cursor.r) { // Bottom right corner
    return function (dx, dy) { return this.delta({ width : dx, height : dy }); };
  } else if (Math.abs(cursor.c.x - this.bbox.x) < cursor.r) { // Left side
    return function (dx, dy) { return this.delta({ x : dx, width : -dx }); };
  } else if (Math.abs(cursor.c.y - this.bbox.y) < cursor.r) { // Top side
    return function (dx, dy) { return this.delta({ y : dy, height : -dy }); };
  } else if (Math.abs(cursor.c.x - this.bbox.x2) < cursor.r) { // Right side
    return function (dx, dy) { return this.delta({ width : dx }); };
  } else if (Math.abs(cursor.c.y - this.bbox.y2) < cursor.r) { // Bottom side
    return function (dx, dy) { return this.delta({ height : dy }); };
  }
};

module.exports = Rect;
