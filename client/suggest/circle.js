var _ = require('lodash'),
    Circle = require('../shape/circle'),
    Polyline = require('../shape/polyline'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    _stat = require('jstat').jStat;

var GAP_SIGNIFICANCE = 0.4;

module.exports = function suggestCircle(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape instanceof Polyline && shape.points.length > 6) {
    var dists = _.map(shape.points, _.bind(Point.prototype.distanceFrom, shape.bbox.c)),
        r = _stat.mean(dists),
        gapFactor = 1 - (_.first(shape.points).distanceFrom(_.last(shape.points)) / shape.extent);

    return _.assign(picture.action.replacement(element, new Circle({
      cx : shape.bbox.cx,
      cy : shape.bbox.cy,
      r : r
    })), {
      confidence : (1 - (_stat.stdev(dists) / r)) * (1 - GAP_SIGNIFICANCE) + gapFactor * GAP_SIGNIFICANCE
    });
  }
}
