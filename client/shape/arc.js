var _ = require('lodash'),
    _svgp = require('svg-points'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
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
  return e.node.nodeName === 'path' && toPointObjects(e.attr('d')) && new Arc(Shape.nodeAttr(e));
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

Arc.prototype.computePoints = function () {
  // Start and end points
  return [this.p1, this.p2];
};

Arc.prototype.computeBBox = function () {
  if (this.curve.largeArcFlag) {
    // Large arc bbox is the bbox of the full ellipse
    // Intersection params have calculated the centre as a point
    var pathParams = this.params.params[0], arcParams = pathParams[0];
    return Ellipse.computeBBox(arcParams.params[0], this.curve.rx, this.curve.ry);
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

Arc.prototype.deltaD = function (deltas) {
  return this.delta({ d : _svgp.toPath(_.reduce(deltas, function (svgp, d, path) {
    return _.update(svgp, path, function (v) { return (v || 0) + d; });
  }, [{ x : p1.x, y : p1.y }, { x : p2.x, y : p2.y, curve : _.clone(this.curve) }])) });
};

Arc.prototype.mover = function (isEdge, cursor) {
  if (!isEdge) {
    // Move the whole shape
    return function (dx, dy) {
      return this.deltaD({ '0.x' : dx, '0.y' : dy, '1.x' : dx, '1.y' : dy });
    };
  } else if (this.points[0].distanceFrom(cursor.c) < cursor.r) {
    // Move the first point
    return function (dx, dy) {
      return this.deltaD({ '0.x' : dx, '0.y' : dy });
    };
  } else if (this.points[1].distanceFrom(cursor.c) < cursor.r) {
    // Move the last point
    return function (dx, dy) {
      return this.deltaD({ '1.x' : dx, '1.y' : dy });
    };
  } else {
    // Adjust the radii (TODO: refine)
    return function (dx, dy) {
      return this.deltaD({ '1.curve.rx' : dx, '1.curve.ry' : dy });
    };
  }
};

module.exports = Arc;
