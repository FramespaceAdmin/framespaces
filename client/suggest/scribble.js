var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('../shape/polyline'),
    Removal = require('../action/removal'),
    Point = require('kld-affine').Point2D,
    Vector = require('kld-affine').Vector2D;

var MIN_POINTS = 6, MIN_REVERSES = 4, INTERSECTS_FACTOR = 4;

module.exports = function suggestScribble(picture, lastAction) {
  var pline = _.last(lastAction.results), shape = pline && !pline.removed && Shape.of(pline);
  if (shape && shape instanceof Polyline && shape.getPoints().length >= MIN_POINTS) {
    // Work out how many times the line has reversed on itself
    var reverses = _.reduce(shape.getPoints().slice(1, shape.getPoints().length - 1), function (reverses, p, i) {
      var coming = Vector.fromPoints(shape.getPoints()[i], p),
          going = Vector.fromPoints(shape.getPoints()[i+2], p);
      // Angles of <60 degrees count as reversals
      return Math.abs(coming.angleBetween(going)) < Math.PI/3 ? reverses.concat(p) : reverses;
    }, [])

    if (reverses.length >= MIN_REVERSES) {
      // Searching within the scribble's bounding box
      return _.last(_.sortBy(_.reduce(picture.elements(shape.getBBox()), function (candidates, other) {
        if (other !== pline) {
          var otherShape = Shape.of(other);
          // Look for shapes we intersect with
          var removeShape = new Removal(otherShape).andCollateral(picture),
              removeScribble = new Removal(shape).andCollateral(picture);
          candidates.push(removeShape.and(removeScribble, {
            confidence : 1 - 1 / (shape.intersect(otherShape).length * INTERSECTS_FACTOR)
          }));
          // TODO: Look for shapes we fill
        }
        return candidates;
      }, []), 'confidence'));
    }
  }
}
