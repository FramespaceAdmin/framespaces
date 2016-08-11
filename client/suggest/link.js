var _ = require('lodash')
    Point = require('kld-affine').Point2D,
    Line = require('../shape/line'),
    Shape = require('../shape'),
    mean = require('compute-mean');

module.exports = function suggestLink(picture, element) {
  var line = (element && !element.removed && Shape.of(element));
  if (line && line instanceof Line && !line.hasClass('link')) {
    function suggestEnd(point) {
      return _.maxBy(_.map(picture.allElements(), function (e) {
        // Confidence is based on the distance of the point from the shape centre or nearest intersect
        var shape = Shape.of(e), points = line.intersect(shape).concat(shape.bbox.c),
            d = _.min(_.map(points, _.bind(point.distanceFrom, point)));
        return { e : e, confidence : 1 - (d / shape.extent) };
      }), 'confidence');
    }
    var from = suggestEnd(line.ends[0]), to = suggestEnd(line.ends[1]);
    if (from.e !== to.e) {
      return _.assign(picture.action.mutation(element, line.delta({
        from : from.e.attr('id'),
        to : to.e.attr('id'),
        class : 'link'
      })), {
        confidence : mean([from.confidence, to.confidence])
      });
    } // TODO: sow's ear!
  }
}
