var _ = require('lodash'),
    Vector = require('kld-affine').Vector2D,
    vector = Vector.fromPoints,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Path = require('./path'),
    Line = require('../shape/line');

function Arc(attr) {
  Path.call(this, attr);
}

function pointAngle(point, end1, end2) {
  return vector(end1, end2).angleBetween(vector(end1, point));
};

Arc.fromJSON = function (data) {
  return data.name === 'path' && Arc.isArc(data.attr.d) && new Arc(data.attr);
};

Arc.fromElement = function (e) {
  return Shape.elementName(e) === 'path' && Arc.isArc(Shape.elementAttr(e, 'd')) && new Arc(Shape.elementAttr(e));
};

Arc.isArc = function (d) {
  var path = Path.parse(d);
  return path.length === 2 && _.get(path, '1.curve.type') === 'arc';
};

Arc.d = function (end1, end2, curve) {
  return Path.toString([{ x : end1.x, y : end1.y }, {
    // Allow omission of curve type
    x : end2.x, y : end2.y, curve : _.set(curve, 'type', 'arc')
  }]);
}

Arc.curveTraversing = function (end1, point, end2) {
  var r = Math.abs(end2.distanceFrom(end1) /
    (2 * Math.sin(vector(point, end1).angleBetween(vector(point, end2)))));
  return {
    type : 'arc',
    rx : r, ry: r,
    largeArcFlag : end1.lerp(end2, 0.5).distanceFrom(point) > r,
    sweepFlag : pointAngle(point, end1, end2) < 0
  };
};

Arc.prototype = Object.create(Path.prototype);
Arc.prototype.constructor = Arc;

Arc.prototype.getChord = function () {
  return this.chord || (this.chord = vector(this.getEnds()[0], this.getEnds()[1]));
};

Arc.prototype.getCentre = function () {
  if (!this.centre) {
    // Intersection params have calculated the centre as a point
    var pathParams = this.getParams().params[0], arcParams = pathParams[0];
    this.centre = arcParams.params[0];
  }
  return this.centre;
};

Arc.prototype.computeBBox = function () {
  // Draw a cross and intersect with the arc to find north, south, east and west points
  var xVec = new Vector(this.path[1].curve.rx, 0), yVec = new Vector(0, this.path[1].curve.ry),
      xRay = Line.fromPoints(this.getCentre().subtract(xVec), this.getCentre().add(xVec)),
      yRay = Line.fromPoints(this.getCentre().subtract(yVec), this.getCentre().add(yVec));
  return Shape.computeBBox(this.getEnds().concat(this.intersect(xRay)).concat(this.intersect(yRay)));
};

Arc.prototype.computeExtent = function () {
  if (this.path[1].curve.largeArcFlag) {
    // Large arc extent is the extent of the full ellipse
    return this.path[1].curve.rx + this.path[1].curve.ry; // diameter-ish
  } else {
    // Small arc extent is the extent of the begin and end points
    return this.getChord().length();
  }
};

Arc.prototype.transform = function (matrix) {
  var ends = _.map(this.getEnds(), _.method('transform', matrix)),
      s = matrix.getScale(), dr = Math.min(s.scaleX, s.scaleY);
  return this.delta({ d : {
    '0.x' : _.constant(ends[0].x),
    '0.y' : _.constant(ends[0].y),
    '1.x' : _.constant(ends[1].x),
    '1.y' : _.constant(ends[1].y),
    '1.curve.rx' : function (r) { return r * dr; },
    '1.curve.ry' : function (r) { return r * dr; }
  } });
};

Arc.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) {
    // Move the whole shape
    return function (dx, dy) {
      return this.delta({ d : { '0.x' : dx, '0.y' : dy, '1.x' : dx, '1.y' : dy } });
    };
  } else if (cursor.contains(this.getEnds()[0])) {
    // Move p1
    return function (dx, dy) {
      var fd = this.getEnds()[0].add(new Point(dx, dy)).distanceFrom(this.getEnds()[1]) / this.getChord().length();
      function dr(r) { return r * fd; }
      return this.delta({ d : { '0.x' : dx, '0.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr } });
    };
  } else if (cursor.contains(this.getEnds()[1])) {
    // Move p2
    return function (dx, dy) {
      var fd = this.getEnds()[1].add(new Point(dx, dy)).distanceFrom(this.getEnds()[0]) / this.getChord().length();
      function dr(r) { return r * fd; }
      return this.delta({ d : { '1.x' : dx, '1.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr } });
    };
  } else {
    // Re-arrange the world so that the arc still traverses p1, p2 and x,y (circumcentre)
    return function (dx, dy, x, y) {
      return this.delta({ d : { '1.curve' : Arc.curveTraversing(this.getEnds()[0], new Point(x, y), this.getEnds()[1]) } });
    };
  }
};

Arc.prototype.close = function () {
  if (this.path[1].curve.rx === this.path[1].curve.ry) {
    return this.cloneAs('circle', {
      d : undefined, cx : this.getCentre().x, cy : this.getCentre().y, r : this.path[1].curve.rx
    });
  } else {
    return this.cloneAs('ellipse', {
      d : undefined, cx : this.getCentre().x, cy : this.getCentre().y, rx : this.path[1].curve.rx, ry : this.path[1].curve.ry
    });
  }
};

Arc.prototype.pointAngle = function (p) {
  return pointAngle(p, this.getEnds()[0], this.getEnds()[1]);
};

Arc.prototype.minus = function (that) {
  var points = _.sortBy(this.pointsMinus(that), _.bind(function (p) {
    // Point angle reduces as you go from p1 to p2
    return -Math.abs(p.equals(this.getEnds()[0]) ? Math.PI : this.pointAngle(p));
  }, this));
  return Arc.arcsBetween(points, this.path[1].curve, this.getCentre());
};

Arc.arcsBetween = function (points, curve, centre) {
  return _.reduce(points, function (arcs, p2, i) {
    if (i % 2) {
      var p1 = points[i - 1];
      if (!p1.equals(p2)) {
        var isLargeArc = Arc.isLargeArc(centre, p1, p2, curve.sweepFlag);
        arcs.push(new Arc({ d : Arc.d(p1, p2, _.set(curve, 'largeArcFlag', isLargeArc)) }));
      }
    }
    return arcs;
  }, []);
};

Arc.isLargeArc = function (c, p1, p2, sweepFlag) {
  return sweepFlag === (vector(c, p1).cross(vector(c, p2)) < 0);
};

module.exports = Arc;
