var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    createVector = require('kld-affine').Vector2D.fromPoints;

var RIGHT_ANGLE = Math.PI / 2;

function candidateSegment(points) {
  function nextCandidate(prev, i) {
    var vector = createVector(points[0], points[i]);
    var sumVar = _.reduce(_.slice(points, 1, i), function (sumVar, p, i) {
      var angle = vector.angleBetween(createVector(points[0], p));
      var variance = Math.abs(angle / RIGHT_ANGLE);
      return sumVar + variance;
    }, 0);
    var confidence = (1 - (i > 1 ? sumVar / (i - 1) : 0)) * vector.length();
    return { count : i, sumVar : sumVar, confidence : confidence, length : vector.length() };
  }
  var candidate = { count : 0, sumVar : 0, confidence : 0, length : 0 }, next;
  for (var i = 1; i < points.length; i++) {
    next = nextCandidate(candidate, i);
    // Account for the curious 'last point effect'
    if (next.confidence > candidate.confidence) {
      candidate = next;
    } else {
      return candidate;
    }
  }
  return candidate;
}

module.exports = function suggestSimplify(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape instanceof Polyline && shape.points.length > 2) {
    var segments = _.reduce(shape.points, function (segments, p, i, points) {
      var prev = _.last(segments);
      if (i < points.length - 1 && (!prev || i === prev.startIndex + prev.count)) {
        segments.push(_.assign(candidateSegment(points.slice(i)), {
          startIndex : i, startPoint : p
        }));
      }
      return segments;
    }, []);
    var points = _.map(segments, 'startPoint').concat(_.last(shape.points));
    if (points.length < shape.points.length) {
      return _.assign(points.length > 2 ? picture.action.mutation(element, shape.delta({
        points : Shape.pointStr(points)
      })) : picture.action.replacement(element, new Line({
        x1 : points[0].x, y1 : points[0].y, x2 : points[1].x, y2 : points[1].y
      })), {
        confidence : _.sumBy(segments, 'confidence') / _.sumBy(segments, 'length')
      });
    }
  }
};
