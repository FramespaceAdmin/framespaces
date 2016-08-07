var _ = require('lodash'),
    _svgp = require('svg-points'),
    vector = require('kld-affine').Vector2D.fromPoints,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Ellipse = require('./ellipse');

/**
 * Prototype object for a curve, as used for 'curve' member.
 * Note that an svg-points 'curve' is all-numeric, and does not have a c or an angle.
 */
var CURVE = {
  c : null, // Point2D
  rx : 0.0,
  ry : 0.0,
  angle : 0.0,
  sweepFlag : false,
  largeArcFlag : false
};

function Arc(attr) {
  var pointObjects = pathToPointObjects(attr.d);
  this.ends = [
    new Point(pointObjects[0].x, pointObjects[0].y),
    new Point(pointObjects[1].x, pointObjects[1].y)
  ];
  this.curve = _(pointObjects[1].curve).mapValues(function (v, k) {
    return _.isBoolean(CURVE[k]) ? Boolean(v) : v;
  }).defaults(CURVE).value();
  this.chord = this.ends[0].distanceFrom(this.ends[1]);

  Shape.call(this, 'path', attr);
}

function pathToPointObjects(d) {
  var svgp = _svgp.toPoints({ type : 'path', d : d });
  return svgp.length === 2 && _.get(svgp, '1.curve.type') === 'arc' && svgp;
}

function pointsToPointObjects(p1, p2, curve) {
  return [{ x : p1.x, y : p1.y }, {
    // Coerce all parameters to be numbers (avoiding 'true' & 'false')
    x : p2.x, y : p2.y, curve : _.set(_.mapValues(curve, Number), 'type', 'arc')
  }];
}

Arc.fromJSON = function (data) {
  return data.name === 'path' && pathToPointObjects(data.attr.d) && new Arc(data.attr);
};

Arc.of = function (e) {
  return e.node.nodeName === 'path' && pathToPointObjects(e.attr('d')) && new Arc(Shape.strongAttr(e));
};

Arc.fromPoints = function (p1, p2, curve) {
  // Allow omission of curve type
  return new Arc({ d : _svgp.toPath(pointsToPointObjects(p1, p2, curve)) });
}

Arc.prototype = Object.create(Shape.prototype);
Arc.prototype.constructor = Arc;

Arc.prototype.computeParams = function () {
  var params = Shape.prototype.computeParams.call(this);
  // Intersection params have calculated the centre as a point
  var pathParams = params.params[0], arcParams = pathParams[0];
  this.curve.c = arcParams.params[0];
  this.curve.angle = Arc.segmentAngle(this.curve.c, this.ends[0], this.ends[1]);
  return params;
}

Arc.prototype.computePoints = function () {
  return this.ends;
};

Arc.prototype.computeEnds = function () {
  return this.ends;
};

Arc.prototype.computeBBox = function () {
  if (this.curve.largeArcFlag) {
    // Large arc bbox is the bbox of the full ellipse
    return Ellipse.computeBBox(this.curve.c, this.curve.rx, this.curve.ry);
  } else {
    // Small arc bbox is the bbox of the begin and end points
    return Shape.prototype.computeBBox.call(this);
  }
};

Arc.prototype.computeExtent = function () {
  if (this.curve.largeArcFlag) {
    // Large arc extent is the extent of the full ellipse
    return this.curve.rx + this.curve.ry; // diameter-ish
  } else {
    // Small arc extent is the extent of the begin and end points
    return this.chord;
  }
};

Arc.prototype.toPointObjects = function () {
  return pointsToPointObjects(this.ends[0], this.ends[1], this.curve);
}

Arc.prototype.deltaD = function (deltas) {
  return this.delta({ d : _svgp.toPath(_.reduce(deltas, function (svgp, d, path) {
    return _.update(svgp, path, _.isNumber(d) ? function (v) { return (v || 0) + d; } : d);
  }, this.toPointObjects())) });
};

Arc.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) {
    // Move the whole shape
    return function (dx, dy) {
      return this.deltaD({ '0.x' : dx, '0.y' : dy, '1.x' : dx, '1.y' : dy });
    };
  } else if (cursor.contains(this.ends[0])) {
    // Move p1
    return function (dx, dy) {
      var fd = this.ends[0].add(new Point(dx, dy)).distanceFrom(this.ends[1]) / this.chord;
      function dr(r) { return r * fd; }
      return this.deltaD({ '0.x' : dx, '0.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr });
    };
  } else if (cursor.contains(this.ends[1])) {
    // Move p2
    return function (dx, dy) {
      var fd = this.ends[1].add(new Point(dx, dy)).distanceFrom(this.ends[0]) / this.chord;
      function dr(r) { return r * fd; }
      return this.deltaD({ '1.x' : dx, '1.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr });
    };
  } else {
    // Re-arrange the world so that the arc still traverses p1, p2 and x,y (circumcentre)
    return function (dx, dy, x, y) {
      var p = new Point(x, y);
      var r = Math.abs(this.chord /
        (2 * Math.sin(vector(p, this.ends[0]).angleBetween(vector(p, this.ends[1])))));
      return this.deltaD(_({
        '1.curve.rx' : r,
        '1.curve.ry': r,
        '1.curve.largeArcFlag' : this.ends[0].lerp(this.ends[1], 0.5).distanceFrom(p) > r,
        '1.curve.sweepFlag' : this.pointAngle(p) < 0
      }).mapValues(Number).mapValues(_.constant).value());
    };
  }
};

Arc.prototype.close = function () {
  if (this.curve.rx === this.curve.ry) {
    return this.cloneAs(require('./circle'), {
      d : undefined, cx : this.curve.c.x, cy : this.curve.c.y, r : this.curve.rx
    });
  } else {
    return this.cloneAs(Ellipse, {
      d : undefined, cx : this.curve.c.x, cy : this.curve.c.y, rx : this.curve.rx, ry : this.curve.ry
    });
  }
};

Arc.prototype.pointAngle = function (p) {
  return vector(this.ends[0], this.ends[1]).angleBetween(vector(this.ends[0], p));
};

Arc.segmentAngle = function (c, p1, p2) {
  return vector(c, p1).angleBetween(vector(c, p2));
};

Arc.prototype.minus = function (that) {
  var points = _.sortBy(this.pointsMinus(that), _.bind(function (p) {
    // Point angle reduces as you go from p1 to p2
    return -Math.abs(p.equals(this.ends[0]) ? Math.PI : this.pointAngle(p));
  }, this));
  return Arc.arcsBetween(points, this.curve);
};

Arc.arcsBetween = function (points, curve) {
  return _.reduce(points, function (arcs, p2, i) {
    if (i % 2) {
      var p1 = points[i - 1];
      if (!p1.equals(p2)) {
        arcs.push(Arc.fromPoints(p1, p2, {
          rx : curve.rx,
          ry : curve.ry,
          largeArcFlag : curve.largeArcFlag &&
            Math.sign(curve.angle) === Math.sign(Arc.segmentAngle(curve.c, p1, p2)),
          sweepFlag : curve.sweepFlag
        }));
      }
    }
    return arcs;
  }, []);
};

module.exports = Arc;
