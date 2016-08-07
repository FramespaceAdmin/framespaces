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

Polyline.prototype = Object.create(Shape.prototype);
Polyline.prototype.constructor = Polyline;

Polyline.prototype.computeEnds = function () {
  return [_.first(this.points), _.last(this.points)];
};

Polyline.prototype.mover = function (isEdge, cursor) {
  var factors;
  if (isEdge) {
    var d = _.reduce(this.points, function (d, p) {
      var prev = _.last(d);
      return d.concat({
        p : p,
        fromBegin : prev ? prev.fromBegin + p.distanceFrom(prev.p) : 0,
        fromCursor : p.distanceFrom(cursor.bbox.c)
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
  return this.cloneAs(require('./polygon'), { points : Shape.pointStr(_.initial(this.points)) });
};

Polyline.prototype.reverse = function () {
  return this.cloneAs(Polyline, {
    points : Shape.pointStr(_.reverse(_.clone(this.points)))
  });
}

Polyline.prototype.add = function (that) {
  if (that instanceof Line || that instanceof Polyline) {
    return this.cloneAs(Polyline, {
      // Lose our last point
      points : Shape.pointStr(_.initial(this.points).concat(that.points))
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
