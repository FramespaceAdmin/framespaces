var _ = require('lodash')
    Point = require('kld-affine').Point2D,
    Line = require('../shape/line'),
    Arc = require('../shape/arc'),
    Linkline = require('../shape/linkline'),
    Shape = require('../shape'),
    mean = require('compute-mean');

module.exports = function suggestLink(picture, element) {
  var line = (element && !element.removed && Shape.of(element));
  if (line && (line instanceof Line || line instanceof Arc) && !line.hasClass('link')) {
    function suggestEnd(point) {
      return _.maxBy(_.map(picture.allElements(), function (e) {
        if (e !== element) {
          // Confidence is based on the distance of the point from the shape centre or nearest intersect
          var shape = Shape.of(e), points = line.intersect(shape).concat(shape.bbox.c),
              d = _.min(_.map(points, _.bind(point.distanceFrom, point)));
          return { e : e, shape : shape, confidence : 1 - (d / shape.extent) };
        } else {
          return { confidence : 0 };
        }
      }), 'confidence');
    }
    var from = suggestEnd(line.ends[0]), to = suggestEnd(line.ends[1]);
    if (from.confidence > 0 && to.confidence > 0) {
      return _.assign(picture.action.mutation(element, line.clone({
        class : 'link',
        from : from.e.attr('id'),
        to : to.e.attr('id')
      }, line instanceof Line ? {
        a1 : Linkline.angle(from.shape, to.shape, line.ends[0]),
        a2 : Linkline.angle(to.shape, from.shape, line.ends[1])
      } : { /* Nothing to add for an Arc */ })), {
        confidence : mean([from.confidence, to.confidence])
      });
    } // TODO: sow's ear!
  }
}
