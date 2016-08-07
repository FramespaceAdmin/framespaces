var _ = require('lodash'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    Rect = require('./rect'),
    Polyline = require('./polyline'),
    Polygon = require('./polygon');

/**
 * A rectline is a polyline in which each point varies from the last in only one of x or y.
 */
function Rectline(attr) {
  Polyline.call(this, attr);
  this.axis1 = this.points[0].x === this.points[1].x ? 'y' : 'x';
  this.axis2 = this.points[1].x === this.points[2].x ? 'y' : 'x';
}

Rectline.check = function (attr) {
  var points = Shape.points(attr.points);
  return _.reduce(points, function (axis, p2, i, ps) {
    var p1 = ps[i - 1];
    switch (i) {
      case 0 : return null;
      case 1 : return p2.x === p1.x ? 'y' : p2.y === p1.y ? 'x' : null;
      default : return axis && p2[axis] === p1[axis] ? axis === 'x' ? 'y' : 'x' : null;
    }
  }, null);
};

Rectline.fromJSON = function (data) {
  return data.name === 'polyline' && Rectline.fromAttr(data.attr);
};

Rectline.of = function (e) {
  return e.node.nodeName === 'polyline' && Rectline.fromAttr(Shape.strongAttr(e));
};

Rectline.fromAttr = function (attr) {
  return Rectline.check(attr) && new Rectline(attr);
};

Rectline.prototype = Object.create(Polyline.prototype);
Rectline.prototype.constructor = Rectline;

Rectline.prototype.pointsMover = function (pointMover/*(dx, dy, p, i , points)*/) {
  return function move(dx, dy) {
    return new Rectline(_.assign(this.attr, {
      points : _(this.points).map(function (p) {
        return pointMover.apply(this, [dx, dy].concat(_.toArray(arguments))) || p;
      }).map(Shape.pointStr).join(',')
    }));
  };
}

Rectline.prototype.mover = function (isEdge, cursor) {
  if (isEdge) {
    // First decide if we have hold of a point or a segment
    var pointIndex = _.findIndex(this.points, _.bind(cursor.contains, cursor));
    if (pointIndex > -1) {
      // Move the point and its neighbours
      return this.pointsMover(function (dx, dy, p, i, points) {
        if (i === pointIndex) {
          return new Point(p.x + dx, p.y + dy);
        } else if (i === pointIndex - 1 || i === pointIndex + 1) {
          return p.x === points[pointIndex].x ?
            new Point(p.x + dx, p.y) : new Point(p.x, p.y + dy);
        }
      });
    } else {
      // Find the nearest segment
      var segmentIndex = _.findIndex(this.points, function (p, i, points) {
        if (i < points.length - 1) {
          return cursor.contains(p.x === points[i + 1].x ?
            new Point(p.x, cursor.bbox.c.y) : new Point(cursor.bbox.c.x, p.y));
        }
      });
      if (segmentIndex > -1) {
        return this.pointsMover(function (dx, dy, p, i, points) {
          if (i === segmentIndex || i === segmentIndex + 1) {
            return points[segmentIndex].x === points[segmentIndex + 1].x ?
              new Point(p.x + dx, p.y) : new Point(p.x, p.y + dy);
          }
        });
      }
    }
  } else {
    return Polyline.prototype.mover.call(this, isEdge, cursor);
  }
};

Rectline.prototype.close = function () {
  // If there are an odd number of points, drop the last one
  var points = this.points.length > 3 && this.points.length % 2 ? _.initial(this.points) : this.points,
      end = _.last(points);
  // Adjust the last point to be recty with respect to the first
  end = _.set({ x : end.x, y : end.y }, this.axis1, points[0][this.axis1]);
  points = (points.length > 3 ? _.initial(points) : points).concat(new Point(end.x, end.y));
  if (points.length === 4) {
    return this.cloneAs(Rect, { points : undefined }, Shape.computeBBox(points));
  } else if (points.length > 4) {
    return this.cloneAs(Polygon, { 'points' : Shape.pointStr(points) });
  }
}

module.exports = Rectline;
