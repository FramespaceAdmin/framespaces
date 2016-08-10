var _ = require('lodash'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    Line = require('./line'),
    _cap = require('svg-intersections');

function Polyline(attr) {
  Shape.call(this, 'polyline', attr);
}

Polyline.fromJSON = function (data) {
  return data.name === 'polyline' && new Polyline(data.attr);
};

Polyline.of = function (e) {
  return e.node.nodeName === 'polyline' && new Polyline(Shape.strongAttr(e));
};

/**
 * Returns an array of points from a polygon or polyline points attribute string
 */
Polyline.points = function (pointsStr) {
  return _(pointsStr.split(',')).chunk(2).map(function (p) {
    return new Point(Number(p[0]), Number(p[1]));
  }).value();
};

/**
 * Returns a polygon or polyline points attribute string from a point or array of points
 */
Polyline.pointStr = function (p) {
  if (_.isArray(p)) {
    return _.map(p, Polyline.pointStr).join(',');
  } else {
    return [p.x, p.y].join(',');
  }
};

Polyline.prototype = Object.create(Shape.prototype);
Polyline.prototype.constructor = Polyline;

Polyline.prototype.computeParams = function () {
  return _cap.shape(this.name, _.mapValues(this.attr, function (value, key) {
    if (key === 'points') {
      // svg-intersections requires space-delimited points
      return _.map(Polyline.points(value), Polyline.pointStr).join(' ');
    } else {
      return value;
    }
  }));
};

Polyline.prototype.computePoints = function () {
  var points = this.points = Shape.prototype.computePoints.call(this);

  // The axis of the first segment if recty, otherwise false
  this.axis = _.reduceRight(points, _.bind(function (axis, p1, i) {
    var p2 = points[this.nextPointIndex(i)];
    if (!p2) {
      return undefined; // Cannot yet determine (p1 is the last point)
    } else if (_.isUndefined(axis)) {
      return p2.x === p1.x ? 'y' : p2.y === p1.y ? 'x' : false; // Determine starting value
    } else if (axis) {
      return p2[axis] === p1[axis] ? axis === 'x' ? 'y' : 'x' : false; // Check expected value
    } else {
      return false; // Fall through
    }
  }, this), undefined);

  return points;
};

Polyline.prototype.computeEnds = function () {
  return [_.first(this.points), _.last(this.points)];
};

Polyline.prototype.nextPointIndex = function (i) {
  if (i < this.points.length - 1) {
    return i + 1;
  }
};

Polyline.prototype.prevPointIndex = function (i) {
  if (i > 0) {
    return i - 1;
  }
};

Polyline.prototype.pointsMover = function (pointMover/*(dx, dy, p, i, points)*/) {
  return function move(dx, dy) {
    return this.clone({
      points : Polyline.pointStr(_.map(this.points, _.bind(function (p) {
        return pointMover.apply(this, [dx, dy].concat(_.toArray(arguments))) || p;
      }, this)))
    });
  };
};

Polyline.prototype.axisEdgeMover = function (cursor) {
  // First decide if we have hold of a point or a segment
  var pointIndex = _.findIndex(this.points, _.bind(cursor.contains, cursor));
  if (pointIndex > -1) {
    // Move the point and its neighbours
    return this.pointsMover(function (dx, dy, p, i, points) {
      if (i === pointIndex) {
        return new Point(p.x + dx, p.y + dy);
      } else if (i === this.prevPointIndex(pointIndex) || i === this.nextPointIndex(pointIndex)) {
        return p.x === points[pointIndex].x ?
          new Point(p.x + dx, p.y) : new Point(p.x, p.y + dy);
      }
    });
  } else {
    // Find the nearest segment
    var segmentIndex = _.findIndex(this.points, _.bind(function (p, i, points) {
      if (!_.isUndefined(this.nextPointIndex(i))) {
        return cursor.contains(p.x === points[this.nextPointIndex(i)].x ?
          new Point(p.x, cursor.bbox.c.y) : new Point(cursor.bbox.c.x, p.y));
      }
    }, this));
    if (segmentIndex > -1) {
      return this.pointsMover(function (dx, dy, p, i, points) {
        if (i === segmentIndex || i === this.nextPointIndex(segmentIndex)) {
          return points[segmentIndex].x === points[this.nextPointIndex(segmentIndex)].x ?
            new Point(p.x + dx, p.y) : new Point(p.x, p.y + dy);
        }
      });
    }
  }
};

Polyline.prototype.freeEdgeMover = function (cursor) {
  var d = _.reduce(this.points, function (d, p) {
    var prev = _.last(d);
    return d.concat({
      p : p,
      fromBegin : prev ? prev.fromBegin + p.distanceFrom(prev.p) : 0,
      fromCursor : p.distanceFrom(cursor.bbox.c)
    });
  }, []);
  var closest = _.minBy(d, 'fromCursor'), length = _.last(d).fromBegin;
  var factors = _.map(d, function (dp) {
    var fromClosest = Math.abs(dp.fromBegin - closest.fromBegin);
    return 1 - (fromClosest / length);
  });
  return this.pointsMover(function (dx, dy, p, i) {
    return new Point(p.x + dx*factors[i], p.y + dy*factors[i]);
  });
};

Polyline.prototype.mover = function (isEdge, cursor) {
  if (isEdge) {
    if (this.axis) { // We are recty
      return this.axisEdgeMover(cursor);
    } else { // We are not recty
      return this.freeEdgeMover(cursor);
    }
  } else { // Move all points equally
    return this.pointsMover(function (dx, dy, p) {
      return new Point(p.x + dx, p.y + dy);
    });
  }
};

Polyline.prototype.close = function () {
  var points = this.points;

  // For a non-recty line, or if there are an odd number of points, drop the last one
  if (!this.axis || (this.points.length > 3 && this.points.length % 2)) {
    points = _.initial(this.points);
  }

  if (this.axis) { // We are recty
    // Adjust the last point to be recty with respect to the first
    end = _.set({ x : _.last(points).x, y : _.last(points).y }, this.axis, points[0][this.axis]);
    points = (points.length > 3 ? _.initial(points) : points).concat(new Point(end.x, end.y));
    if (points.length === 4) {
      // A recty polygon with exactly four points is a rect
      return this.cloneAs(require('./rect'), { points : undefined }, Shape.computeBBox(points));
    }
  }
  return this.cloneAs(require('./polygon'), { points : Polyline.pointStr(points) });
};

Polyline.prototype.reverse = function () {
  return this.cloneAs(Polyline, {
    points : Polyline.pointStr(_.reverse(_.clone(this.points)))
  });
}

Polyline.prototype.add = function (that) {
  if (that instanceof Line || that instanceof Polyline) {
    return this.cloneAs(Polyline, {
      // Lose our last point
      points : Polyline.pointStr(_.initial(this.points).concat(that.points))
    });
  }
};

Polyline.prototype.minus = function (that) {
  return Polyline.pointsMinus(this.points, that);
};

Polyline.pointsMinus = function (points, shape) {
  // Consider each line segment in turn
  return _.flatten(_.reduce(Line.linesBetween(points), function (fragments, line, i) {
    var prevFragment = _.last(fragments),
        prevPoint = _.last(_.get(prevFragment, 'points')),
        lineFragments = line.minus(shape);

    if (prevPoint && lineFragments.length && prevPoint.equals(lineFragments[0].points[0])) {
      // Extend the previous fragment with the new line (consumes first line fragment)
      fragments.splice(fragments.length - 1, 1, prevFragment.add(lineFragments.shift()));
    }
    return fragments.concat(lineFragments);
  }, []));
};

module.exports = Polyline;
