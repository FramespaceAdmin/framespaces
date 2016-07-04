var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('../shape/polyline'),
    Rect = require('../shape/rect'),
    Point = require('kld-affine').Point2D,
    _stat = require('jstat').jStat;

var GAP_SIGNIFICANCE = 0.4;

module.exports = function suggestRect(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape instanceof Polyline && shape.points.length > 6) {
    var gapFactor = 1 - (_.first(shape.points).distanceFrom(_.last(shape.points)) / shape.extent);

    // Assign all points to their nearest side
    var pointSides = Array(shape.points.length), sides = _.transform(shape.points, function (sides, point, i) {
      pointSides[i] = _.first(_.sortBy(_.map(['left', 'top', 'right', 'bottom'], function (side) {
        return { side : side, d : Math.abs(point[sides[side].axis] - sides[side].pos) };
      }), 'd')).side;
      sides[pointSides[i]].ps.push(point[sides[pointSides[i]].axis]);
    }, {
      left : { ps : [], axis : 'x', pos : shape.bbox.x, confidence : 0 },
      top : { ps : [], axis : 'y', pos : shape.bbox.y, confidence : 0 },
      right : { ps : [], axis : 'x', pos : shape.bbox.x2, confidence : 0 },
      bottom : { ps : [], axis : 'y', pos : shape.bbox.y2, confidence : 0 }
    });

    // Now position the side to the averages and assign a confidence for the side
    _.each(sides, function (side) {
      if (side.ps.length) {
        side.pos = _stat.mean(side.ps);
        side.confidence = 1 - (_stat.stdev(side.ps) / ((side.axis == 'x' ? shape.bbox.width : shape.bbox.height) / 2));
      }
    });

    return _.assign(picture.action.replacement(element, new Rect({
      x : sides.left.pos, y : sides.top.pos,
      width : sides.right.pos - sides.left.pos,
      height : sides.bottom.pos - sides.top.pos
    })), {
      // Confidence is weighted by points, not sides
      confidence : _stat.mean(_.map(pointSides, function (pointSide) {
        return sides[pointSide].confidence;
      })) * (1 - GAP_SIGNIFICANCE) + gapFactor * GAP_SIGNIFICANCE
    });
  }
}
