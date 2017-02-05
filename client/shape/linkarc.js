var _ = require('lodash'),
    Shape = require('../shape'),
    Path = require('./path'),
    Arc = require('./arc'),
    Point = require('kld-affine').Point2D,
    Vector = require('kld-affine').Vector2D;

function Linkarc(attr) {
  Arc.call(this, Shape.delta(attr, { class : 'link' }));
}

Linkarc.fromJSON = function (data) {
  return data.name === 'path' && Arc.isArc(data.attr.d) && Shape.hasClass(data.attr, 'link') && new Linkarc(data.attr);
};

Linkarc.fromElement = function (e) {
  return Shape.elementName(e) === 'path' && (function (attr) {
    return Arc.isArc(attr.d) && Shape.hasClass(attr, 'link') && new Linkarc(attr);
  })(Shape.elementAttr(e));
};

Linkarc.prototype = Object.create(Arc.prototype);
Linkarc.prototype.constructor = Linkarc;

Linkarc.prototype.ATTR = Arc.prototype.ATTR.with({
  from : String,
  to : String
});

Linkarc.prototype.link = function (from, to) {
  // Construct an arc with the same curve that traverses the shape centres
  var c1 = from.bbox.c, c2 = to.bbox.c, mc = c1.lerp(c2, 0.5),
      cc = this.withEnds(c1, c2),
      p1 = Shape.closest(cc.intersect(from), mc) || c1,
      p2 = Shape.closest(cc.intersect(to), mc) || c2;

  return cc.withEnds(p1, p2).clone({ from : from.attr.id, to : to.attr.id });
};

Linkarc.prototype.withEnds = function (p1, p2) {
  if (p1.equals(this.ends[0]) && p2.equals(this.ends[1])) {
    return this;
  } else {
    var curve = this.path[1].curve, d = p1.distanceFrom(p2);
    return this.delta({ d : _.mapValues({
      '0.x' : p1.x, '0.y' : p1.y, '1.x' : p2.x, '1.y' : p2.y,
      '1.curve.rx' : Math.max(curve.rx, d/2),
      '1.curve.ry' : Math.max(curve.ry, d/2),
      '1.curve.largeArcFlag' : Arc.isLargeArc(this.centre, p1, p2, curve.sweepFlag)
    }, _.constant) });
  }
};

Linkarc.prototype.mover = function (isEdge, cursor, getShapeById) {
  var from = getShapeById(this.attr.from), to = getShapeById(this.attr.to);
  var traverse = _.bind(function (point) {
    return this.delta({ d : {
      '1.curve' : _.constant(Arc.curveTraversing(from.bbox.c, point, to.bbox.c))
    } }).link(from, to);
  }, this);
  if (isEdge) {
    return function (dx, dy, x, y) {
      // Traverse the cursor's location by changing the curve
      return traverse(new Point(x, y));
    };
  } else {
    return function (dx, dy) {
      // Apply the delta to the mid-point of the current curve
      var mc = this.ends[0].add(this.chord.divide(2)),
          pv = this.chord.perp().unit().multiply(this.extent),
          mp = this.intersect(Line.fromPoints(mc.add(pv), mc.subtract(pv)))[0];
      return traverse(mp.add(new Vector(dx, dy)));
    };
  }
};

Linkarc.prototype.add = null; // Links cannot be added to

Linkarc.prototype.close = null; // Links cannot be closed

module.exports = Linkarc;
