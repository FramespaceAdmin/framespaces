var _ = require('lodash'),
    Arc = require('../shape/arc'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    vector = require('kld-affine').Vector2D.fromPoints,
    stdev = require('compute-stdev');

module.exports = function suggestArcify(picture, element) {
  var shape = element && !element.removed && Shape.fromElement(element);
  if (shape && shape instanceof Polyline && shape.points.length > 3 && shape.ends.length) {
    // The centroid, C, of the shape will indicate the direction of the arc
    var p1 = shape.ends[0], p2 = shape.ends[1],
        C = new Point(_.mean(_.map(shape.points, 'x')), _.mean(_.map(shape.points, 'y'))),
        m = p1.lerp(p2, 0.5);
    // The line from the mid-point, through the centroid, is a part of a radius
    // Extend a vector well beyond the extent, and intersect to find an approximate sagitta
    var rv = vector(m, C).unit().multiply(2 * shape.extent);
    var i = _.maxBy(shape.intersect(new Line({
      x1 : m.x, y1 : m.y, x2 : m.x + rv.x, y2 : m.y + rv.y
    })), _.method('distanceFrom', m));
    if (i && !m.equals(i)) {
      // Sagitta, half-chord and so radius (see http://liutaiomottola.com/formulae/sag.htm)
      var s = i.distanceFrom(m), l = p1.distanceFrom(m), r = (s*s + l*l) / (2*s);
      // Work from the intersect back to find the centre
      var c = i.add(vector(i, m).unit().multiply(r));
      // Find the distances of all points from the putative centre
      var dists = _.map(shape.points, _.method('distanceFrom', c));

      return _.assign(picture.action.replacement(element, Arc.fromPoints(p1, p2, {
        rx : r, ry : r, largeArcFlag : s > r, sweepFlag : vector(p1, p2).angleBetween(vector(p1, i)) < 0
      })), {
        // Confidence is in the distance of all points from the centre, and the number of points
        confidence : (1 - stdev(dists) / r) * (1 - 1 / shape.points.length)
      });
    }
  }
}
