var _ = require('lodash'),
    Mutation = require('../action/mutation'),
    Replacement = require('../action/replacement'),
    Shape = require('../shape'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    vector = require('kld-affine').Vector2D.fromPoints;

var RIGHT_ANGLE = Math.PI / 2;

// Iteratee is called with (accumulator, point, index, count)
// Note that this reduction will terminate if the iteratee returns undefined
function reducePoints(polyline, begin, iteratee, accumulator) {
  var i = begin;
  for (var count = 1; !_.isUndefined(i); count++) {
    var next = iteratee(accumulator, polyline.points[i], i, count);
    if (_.isUndefined(next)) break;
    accumulator = next;
    i = polyline.nextPointIndex(i);
    if (i === begin) break;
  }
  return accumulator;
}

function suggestSegment(polyline, begin) {
  var p1 = polyline.points[begin], nextIndex = polyline.nextPointIndex(begin);
  return reducePoints(polyline, nextIndex, function (candidate, p2, i, count) {
    var segmentVector = vector(p1, p2), length = segmentVector.length();
    var sumVar = reducePoints(polyline, nextIndex, function (sumVar, p, i2) {
      if (i2 !== i) {
        var angle = segmentVector.angleBetween(vector(p1, p));
        return sumVar + Math.abs(angle / RIGHT_ANGLE);
      }
    }, 0);
    var confidence = (1 - (count > 1 ? sumVar / (count - 1) : 0)) * length;
    if (confidence > candidate.confidence) {
      return _.assign(candidate, { end : i, confidence : confidence, length : length });
    }
  }, { begin : begin, end : -1, p1 : p1, confidence : 0, length : 0 });
}

function suggestSegments(polyline, begin) {
  return reducePoints(polyline, begin, function (segments, p, i) {
    var prev = _.last(segments);
    if (!prev || i === prev.end) {
      segments.push(suggestSegment(polyline, i));
    }
    return segments;
  }, []);
}

module.exports = function suggestSimplify(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape instanceof Polyline && shape.points.length > 2) {
    var segments = suggestSegments(shape, 0), lastSegment = _.last(segments);
    // For a polygon, the last segment may wrap. If so, try again with the last segment end.
    if (lastSegment.end > 0) { // Last segment of a polyline has end == -1
      segments = suggestSegments(shape, lastSegment.end);
    }
    var points = _.map(segments, 'p1');
    if (points.length < shape.points.length) {
      return _.assign(points.length > 2 ? new Mutation(shape, shape.delta({
        points : Polyline.pointStr(points)
      })) : new Replacement(shape, shape.cloneAs('line', {
        x1 : points[0].x, y1 : points[0].y, x2 : points[1].x, y2 : points[1].y,
        points : undefined
      })), {
        confidence : _.sumBy(segments, 'confidence') / _.sumBy(segments, 'length')
      });
    }
  }
};
