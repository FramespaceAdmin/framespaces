var _ = require('lodash'),
    Shape = require('../shape'),
    Line = require('./line');

function Linkline(line, from, to) {
  var ox = line.attr.ox || 0, oy = line.attr.oy || 0,
      cx1 = from.bbox.cx, cy1 = from.bbox.cy, cx2 = to.bbox.cx, cy2 = to.bbox.cy;
  // Offset centre to centre line
  var cc = new Line({ x1 : cx1 + ox, y1 : cy1 + oy, x2 : cx2 + ox, y2 : cy2 + oy });
  // "from" centre to ox, oy
  var c1o = new Line({ x1 : cx1, y1 : cy1, x2 : cx1 + ox, y2 : cy1 + oy });
  // "to" centre to ox, oy
  var c2o = new Line({ x1 : cx2, y1 : cy2, x2 : cx2 + ox, y2 : cy2 + oy });
  // For each shape, identify candidate link ends
  function intersects(shape, intersects, line) {
    return intersects.length ? intersects : line.intersect(shape);
  }
  var p1s = _.reduce([cc, c1o], _.partial(intersects, from), []);
  var p2s = _.reduce([cc, c2o], _.partial(intersects, to), []);
  // Use the closest link ends
  var ends = _.reduce(p1s, function (ends, p1) {
    return _.reduce(p2s, function (ends, p2) {
      var d = p1.distanceFrom(p2);
      return d < ends.d ? { p1 : p1, p2 : p2, d : d } : ends;
    }, ends);
  }, { p1 : null, p2 : null, d : Number.MAX_VALUE });

  // If we still don't have a begin and end, give up and use the centres
  Line.call(this, _.defaults({
    x1 : ends.p1 ? ends.p1.x : cx1, y1 : ends.p1 ? ends.p1.y : cy1,
    x2 : ends.p2 ? ends.p2.x : cx2, y2 : ends.p2 ? ends.p2.y : cy2
  }, line.deltaAttr({ class : 'link' })));
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

Linkline.prototype.delta = function (dAttr) {
  return new _Linkline(this.deltaAttr(dAttr));
};

Linkline.prototype.mover = function () {
  return function (dx, dy) {
    // ox and oy are horizontal and vertical offsets from linked shape centre
    return this.delta({ ox : dx, oy : dy });
  };
};

module.exports = Linkline;
