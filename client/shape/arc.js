var _ = require('lodash'),
    _svgp = require('svg-points'),
    vector = require('kld-affine').Vector2D.fromPoints,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Circle = require('./circle'),
    Ellipse = require('./ellipse');

function Arc(attr) {
  var pointObjects = toPointObjects(attr.d);
  this.ends = [
    new Point(pointObjects[0].x, pointObjects[0].y),
    new Point(pointObjects[1].x, pointObjects[1].y)
  ];
  this.curve = pointObjects[1].curve;
  this.chord = this.ends[0].distanceFrom(this.ends[1]);

  Shape.call(this, 'path', attr);
}

function toPointObjects(d) {
  var svgp = _svgp.toPoints({ type : 'path', d : d });
  return svgp.length === 2 && _.get(svgp, '1.curve.type') === 'arc' && svgp;
}

Arc.fromJSON = function (data) {
  return data.name === 'path' && toPointObjects(data.attr.d) && new Arc(data.attr);
};

Arc.of = function (e) {
  return e.node.nodeName === 'path' && toPointObjects(e.attr('d')) && new Arc(Shape.strongAttr(e));
};

Arc.fromPoints = function (p1, p2, params) {
  // Allow omission of curve type
  return new Arc({
    d : _svgp.toPath([{ x : p1.x, y : p1.y }, {
      // Coerce all parameters to be numbers (avoiding 'true' & 'false')
      x : p2.x, y : p2.y, curve : _.set(_.mapValues(params, Number), 'type', 'arc')
    }])
  });
}

Arc.prototype = Object.create(Shape.prototype);
Arc.prototype.constructor = Arc;

Arc.prototype.computeParams = function () {
  var params = Shape.prototype.computeParams.call(this);
  // Intersection params have calculated the centre as a point
  var pathParams = params.params[0], arcParams = pathParams[0];
  this.curve.c = arcParams.params[0];
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
  return [
    { x : this.ends[0].x, y : this.ends[0].y },
    { x : this.ends[1].x, y : this.ends[1].y, curve : _.clone(this.curve) }
  ];
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
    return this.cloneAs(Circle, {
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
  var thisAngle = Arc.segmentAngle(this.curve.c, this.ends[0], this.ends[1]);

  return _.reduce(points, _.bind(function (arcs, p2, i) {
    if (i % 2) {
      var p1 = points[i - 1], angle = Arc.segmentAngle(this.curve.c, p1, p2);
      if (!p1.equals(p2)) {
        arcs.push(Arc.fromPoints(p1, p2, {
          rx : this.curve.rx,
          ry : this.curve.ry,
          largeArcFlag : !!this.curve.largeArcFlag && Math.sign(thisAngle) === Math.sign(angle),
          sweepFlag : !!this.curve.sweepFlag
        }));
      }
    }
    return arcs;
  }, this), []);
};

module.exports = Arc;
