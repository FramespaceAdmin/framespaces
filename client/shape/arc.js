var _ = require('lodash'),
    Vector = require('kld-affine').Vector2D,
    vector = Vector.fromPoints,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Path = require('./path'),
    Line = require('../shape/line'),
    Ellipse = require('./ellipse');

function Arc(attr) {
  Path.call(this, attr);
}

function pointAngle(point, end1, end2) {
  return vector(end1, end2).angleBetween(vector(end1, point));
};

Arc.fromJSON = function (data) {
  return data.name === 'path' && Arc.isArc(data.attr.d) && new Arc(data.attr);
};

Arc.of = function (e) {
  return e.node.nodeName === 'path' && Arc.isArc(e.attr('d')) && new Arc(Shape.strongAttr(e));
};

Arc.isArc = function (d) {
  var path = Path.parse(d);
  return path.length === 2 && _.get(path, '1.curve.type') === 'arc';
};

Arc.fromPoints = function (end1, end2, curve) {
  return new Arc({ d : Path.toString([{ x : end1.x, y : end1.y }, {
    // Allow omission of curve type
    x : end2.x, y : end2.y, curve : _.set(curve, 'type', 'arc')
  }]) });
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

Arc.prototype.computeParams = function () {
  var params = Shape.prototype.computeParams.call(this);
  // Intersection params have calculated the centre as a point
  var pathParams = params.params[0], arcParams = pathParams[0];
  this.centre = arcParams.params[0];
  return params;
}

Arc.prototype.computeEnds = function () {
  var ends = Path.prototype.computeEnds.call(this);
  this.chord = vector(ends[0], ends[1]);
  return ends;
};

Arc.prototype.computeBBox = function () {
  // Draw a cross and intersect with the arc to find north, south, east and west points
  var xVec = new Vector(this.path[1].curve.rx, 0), yVec = new Vector(0, this.path[1].curve.ry),
      xRay = Line.fromPoints(this.centre.subtract(xVec), this.centre.add(xVec)),
      yRay = Line.fromPoints(this.centre.subtract(yVec), this.centre.add(yVec));
  return Shape.computeBBox(this.ends.concat(this.intersect(xRay)).concat(this.intersect(yRay)));
};

Arc.prototype.computeExtent = function () {
  if (this.path[1].curve.largeArcFlag) {
    // Large arc extent is the extent of the full ellipse
    return this.path[1].curve.rx + this.path[1].curve.ry; // diameter-ish
  } else {
    // Small arc extent is the extent of the begin and end points
    return this.chord.length();
  }
};

Arc.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) {
    // Move the whole shape
    return function (dx, dy) {
      return this.delta({
        d : Path.delta({ '0.x' : dx, '0.y' : dy, '1.x' : dx, '1.y' : dy })
      });
    };
  } else if (cursor.contains(this.ends[0])) {
    // Move p1
    return function (dx, dy) {
      var fd = this.ends[0].add(new Point(dx, dy)).distanceFrom(this.ends[1]) / this.chord.length();
      function dr(r) { return r * fd; }
      return this.delta({
        d : Path.delta({ '0.x' : dx, '0.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr })
      });
    };
  } else if (cursor.contains(this.ends[1])) {
    // Move p2
    return function (dx, dy) {
      var fd = this.ends[1].add(new Point(dx, dy)).distanceFrom(this.ends[0]) / this.chord.length();
      function dr(r) { return r * fd; }
      return this.delta({
        d : Path.delta({ '1.x' : dx, '1.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr })
      });
    };
  } else {
    // Re-arrange the world so that the arc still traverses p1, p2 and x,y (circumcentre)
    return function (dx, dy, x, y) {
      return this.delta({
        d : Path.delta({ '1.curve' : Arc.curveTraversing(this.ends[0], new Point(x, y), this.ends[1]) })
      });
    };
  }
};

Arc.prototype.close = function () {
  if (this.path[1].curve.rx === this.path[1].curve.ry) {
    return this.cloneAs('circle', {
      d : undefined, cx : this.centre.x, cy : this.centre.y, r : this.path[1].curve.rx
    });
  } else {
    return this.cloneAs('ellipse', {
      d : undefined, cx : this.centre.x, cy : this.centre.y, rx : this.path[1].curve.rx, ry : this.path[1].curve.ry
    });
  }
};

Arc.prototype.pointAngle = function (p) {
  return pointAngle(p, this.ends[0], this.ends[1]);
};

Arc.prototype.minus = function (that) {
  var points = _.sortBy(this.pointsMinus(that), _.bind(function (p) {
    // Point angle reduces as you go from p1 to p2
    return -Math.abs(p.equals(this.ends[0]) ? Math.PI : this.pointAngle(p));
  }, this));
  return Arc.arcsBetween(points, this.path[1].curve, this.centre);
};

Arc.arcsBetween = function (points, curve, centre) {
  return _.reduce(points, function (arcs, p2, i) {
    if (i % 2) {
      var p1 = points[i - 1];
      if (!p1.equals(p2)) {
        var isLargeArc = Arc.isLargeArc(centre, p1, p2, curve.sweepFlag);
        arcs.push(Arc.fromPoints(p1, p2, _.set(curve, 'largeArcFlag', isLargeArc)));
      }
    }
    return arcs;
  }, []);
};

Arc.isLargeArc = function (c, p1, p2, sweepFlag) {
  return sweepFlag === (vector(c, p1).cross(vector(c, p2)) < 0);
};

module.exports = Arc;
