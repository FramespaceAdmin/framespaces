var _ = require('lodash'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    _cap = require('svg-intersections');

function Polyline(attr) {
  Shape.call(this, 'polyline', attr);
}

Polyline.fromJSON = function (data) {
  return data.name === 'polyline' && new Polyline(data.attr);
};

Polyline.of = function (e) {
  return e.node.nodeName === 'polyline' && new Polyline(Shape.nodeAttr(e));
};

Polyline.prototype = Object.create(Shape.prototype);
Polyline.prototype.constructor = Polyline;

Polyline.prototype.computeParams = function () {
  return _cap.shape(this.name, _.mapValues(this.attr, function (value, key) {
    if (key === 'points') {
      // svg-intersections requires space-delimited points
      return _.map(Shape.points(value), Shape.pointStr).join(' ');
    } else {
      return value;
    }
  }));
};

Polyline.prototype.mover = function (isEdge, cursor) {
  var factors;
  if (isEdge) {
    var d = _.reduce(this.points, function (d, p) {
      var prev = _.last(d);
      return d.concat({
        p : p,
        fromBegin : prev ? prev.fromBegin + p.distanceFrom(prev.p) : 0,
        fromCursor : p.distanceFrom(cursor.c)
      });
    }, []);
    var closest = _.minBy(d, 'fromCursor'), length = _.last(d).fromBegin;
    factors = _.map(d, function (dp) {
      var fromClosest = Math.abs(dp.fromBegin - closest.fromBegin);
      return 1 - (fromClosest / length);
    });
  } else {
    // Move all points equally
    factors = _.fill(Array(this.points.length), 1);
  }
  return function move(dx, dy) {
    return new Polyline(_.assign(this.attr, {
      points : Shape.pointStr(_.map(this.points, function (p, i) {
        return new Point(p.x + dx*factors[i], p.y + dy*factors[i]);
      }))
    }));
  };
};

Polyline.prototype.close = function () {
  var Polygon = require('./polygon');
  return new Polygon(_.set(this.attr, 'points', Shape.pointStr(_.initial(this.points))));
};

module.exports = Polyline;
