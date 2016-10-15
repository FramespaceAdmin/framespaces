var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('../shape/polyline'),
    Point = require('kld-affine').Point2D,
    Vector = require('kld-affine').Vector2D;

var MIN_POINTS = 6, MIN_REVERSES = 4, INTERSECTS_FACTOR = 4;

module.exports = function suggestScribble(picture, pline) {
  var shape = pline && !pline.removed && Shape.fromElement(pline);
  if (shape && shape instanceof Polyline && shape.points.length >= MIN_POINTS) {
    // Work out how many times the line has reversed on itself
    var reverses = _.reduce(shape.points.slice(1, shape.points.length - 1), function (reverses, p, i) {
      var coming = Vector.fromPoints(shape.points[i], p),
          going = Vector.fromPoints(shape.points[i+2], p);
      // Angles of <60 degrees count as reversals
      return Math.abs(coming.angleBetween(going)) < Math.PI/3 ? reverses.concat(p) : reverses;
    }, [])

    if (reverses.length >= MIN_REVERSES) {
      return _.last(_.sortBy(_.reduce(picture.allElements(), function (candidates, other) {
        if (other !== pline) {
          var otherShape = Shape.fromElement(other);
          // Look for shapes we intersect with
          candidates.push(_.assign(picture.action.removal(other).and(picture.action.removal(pline)), {
            confidence : 1 - 1 / (shape.intersect(otherShape).length * INTERSECTS_FACTOR)
          }));
          // TODO: Look for shapes we fill
        }
        return candidates;
      }, []), 'confidence'));
    }
  }
}
