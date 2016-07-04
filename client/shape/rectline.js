var _ = require('lodash'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    Polyline = require('./polyline');

/**
 * A rectline is a polyline in which each point varies from the last in only one of x or y.
 */
function Rectline(attr) {
  Polyline.call(this, Shape.deltaAttr(attr, { class : 'rect' }));
}

Rectline.check = function (attr) {
  return _.every(Shape.points(attr.points), function (p, i, ps) {
    return i === 0 || p.x === ps[i - 1].x || p.y === ps[i - 1].y;
  });
};

Rectline.fromJSON = function (data) {
  return data.name === 'polyline' && Rectline.fromAttr(data.attr);
};

Rectline.of = function (e) {
  return e.node.nodeName === 'polyline' && Rectline.fromAttr(Shape.nodeAttr(e));
};

Rectline.fromAttr = function (attr) {
  return Shape.hasClass(attr, 'rect') && Rectline.check(attr) && new Rectline(attr);
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
    var pointIndex = _.findIndex(this.points, function (p) {
      return p.distanceFrom(cursor.c) < cursor.r;
    });
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
          var axis = p.x === points[i + 1].x ? 'x' : 'y';
          return Math.abs(cursor.c[axis] - p[axis]) < cursor.r;
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

module.exports = Rectline;
