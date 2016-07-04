var _ = require('lodash'),
    _svgp = require('svg-points'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Ellipse = require('./ellipse');

function Arc(attr) {
  this.svgp = Arc.toSvgPoints(attr.d);
  Shape.call(this, 'path', attr);
}

Arc.toSvgPoints = function (d) {
  var svgp = _svgp.toPoints({ type : 'path', d : d });
  return svgp.length === 2 && _.get(svgp, '1.curve.type') === 'arc' && svgp;
}

Arc.fromJSON = function (data) {
  return data.name === 'path' && Arc.toSvgPoints(data.attr.d) && new Arc(data.attr);
};

Arc.of = function (e) {
  return e.node.nodeName === 'path' && Arc.toSvgPoints(e.attr('d')) && new Arc(Shape.nodeAttr(e));
};

Arc.prototype = Object.create(Shape.prototype);
Arc.prototype.constructor = Arc;

Arc.prototype.computePoints = function () {
  // Start and end points
  return _.map(this.svgp, function (p) { return new Point(p.x, p.y); });
};

Arc.prototype.computeBBox = function () {
  if (this.svgp[1].curve.largeArcFlag) {
    // Large arc bbox is the bbox of the full ellipse
    // Intersection params have calculated the centre as a point
    var pathParams = this.params.params[0], arcParams = pathParams[0];
    return Ellipse.computeBBox(arcParams.params[0], this.svgp[1].curve.rx, this.svgp[1].curve.ry);
  } else {
    // Small arc bbox is the bbox of the begin and end points
    return Shape.prototype.computeBBox.call(this);
  }
};

Arc.prototype.computeExtent = function () {
  if (this.svgp[1].curve.largeArcFlag) {
    // Large arc extent is the extent of the full ellipse
    return this.svgp[1].curve.rx + this.svgp[1].curve.ry; // diameter-ish
  } else {
    // Small arc extent is the extent of the begin and end points
    return this.points[0].distanceFrom(this.points[1]);
  }
};

Arc.prototype.deltaD = function (deltas) {
  return this.delta({ d : _svgp.toPath(_.reduce(deltas, function (svgp, d, path) {
    return _.update(svgp, path, function (v) { return (v || 0) + d; });
  }, _.cloneDeep(this.svgp))) });
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
