var _ = require('lodash'),
    Arc = require('../shape/arc'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    Removal = require('../action/removal'),
    Addition = require('../action/addition'),
    vector = require('kld-affine').Vector2D.fromPoints,
    stdev = require('compute-stdev');

module.exports = function suggestArcify(picture, lastAction) {
  var element = _.last(lastAction.results),
      shape = element && !element.removed && Shape.of(element);
  if (shape && shape instanceof Polyline && shape.getPoints().length > 3 && shape.getEnds().length) {
    // The centroid, C, of the shape will indicate the direction of the arc
    var p1 = shape.getEnds()[0], p2 = shape.getEnds()[1],
        C = new Point(_.mean(_.map(shape.getPoints(), 'x')), _.mean(_.map(shape.getPoints(), 'y'))),
        m = p1.lerp(p2, 0.5);
    // The line from the mid-point, through the centroid, is a part of a radius
    // Extend a vector well beyond the extent, and intersect to find an approximate sagitta
    var rv = vector(m, C).unit().multiply(2 * shape.getExtent());
    var i = _.maxBy(shape.intersect(new Line({
      x1 : m.x, y1 : m.y, x2 : m.x + rv.x, y2 : m.y + rv.y
    })), _.method('distanceFrom', m));
    if (i && !m.equals(i)) {
      // Sagitta, half-chord and so radius (see http://liutaiomottola.com/formulae/sag.htm)
      var s = i.distanceFrom(m), l = p1.distanceFrom(m), r = (s*s + l*l) / (2*s);
      // Work from the intersect back to find the centre
      var c = i.add(vector(i, m).unit().multiply(r));
      // Find the distances of all points from the putative centre
      var dists = _.map(shape.getPoints(), _.method('distanceFrom', c));

      return new Removal(shape).and(new Addition(shape.cloneAs('path', {
        points : undefined, // Unset Polyline points
        d : Arc.d(p1, p2, {
          rx : r, ry : r,
          largeArcFlag : s > r,
          sweepFlag : vector(p1, p2).angleBetween(vector(p1, i)) < 0
        })
      })), {
        // Confidence is in the distance of all points from the centre, and the number of points
        confidence : (1 - stdev(dists) / r) * (1 - 1 / shape.getPoints().length)
      });
    }
  }
}
