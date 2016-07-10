var _ = require('lodash'),
    _svgp = require('svg-points'),
    vector = require('kld-affine').Vector2D.fromPoints,
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Circle = require('./circle'),
    Ellipse = require('./ellipse');

function Arc(attr) {
  var pointObjects = toPointObjects(attr.d);
  this.p1 = new Point(pointObjects[0].x, pointObjects[0].y);
  this.p2 = new Point(pointObjects[1].x, pointObjects[1].y);
  this.curve = pointObjects[1].curve;

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
  // Start and end points
  return [this.p1, this.p2];
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
    return this.points[0].distanceFrom(this.points[1]);
  }
};

Arc.prototype.toPointObjects = function () {
  return [{ x : this.p1.x, y : this.p1.y }, { x : this.p2.x, y : this.p2.y, curve : _.clone(this.curve) }];
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
  } else if (this.p1.distanceFrom(cursor.c) < cursor.r) {
    // Move p1
    return function (dx, dy) {
      var fd = this.p1.add(new Point(dx, dy)).distanceFrom(this.p2) / this.p1.distanceFrom(this.p2);
      function dr(r) { return r * fd; }
      return this.deltaD({ '0.x' : dx, '0.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr });
    };
  } else if (this.p2.distanceFrom(cursor.c) < cursor.r) {
    // Move p2
    return function (dx, dy) {
      var fd = this.p2.add(new Point(dx, dy)).distanceFrom(this.p1) / this.p2.distanceFrom(this.p1);
      function dr(r) { return r * fd; }
      return this.deltaD({ '1.x' : dx, '1.y' : dy, '1.curve.rx' : dr, '1.curve.ry' : dr });
    };
  } else {
    // Re-arrange the world so that the arc still traverses p1, p2 and x,y (circumcentre)
    return function (dx, dy, x, y) {
      var p = new Point(x, y);
      var r = Math.abs(this.p1.distanceFrom(this.p2) /
        (2 * Math.sin(vector(p, this.p1).angleBetween(vector(p, this.p2)))));
      return this.deltaD(_({
        '1.curve.rx' : r,
        '1.curve.ry': r,
        '1.curve.largeArcFlag' : this.p1.lerp(this.p2, 0.5).distanceFrom(p) > r,
        '1.curve.sweepFlag' : vector(this.p1, this.p2).angleBetween(vector(this.p1, p)) < 0
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

module.exports = Arc;
