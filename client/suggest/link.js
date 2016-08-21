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
    function suggestEnd(p) {
      return _.maxBy(_.map(_.without(picture.allElements(), element), function (e) {
        // Confidence is based on the distance of the point from the shape centre or nearest intersect
        var s = Shape.of(e), end = Shape.closest(line.intersect(s), p) || s.bbox.c,
            d = Math.min(end.distanceFrom(p), s.bbox.c.distanceFrom(p));
        return { shape : s, end : end, confidence : 1 - (d / s.extent) };
      }), 'confidence');
    }
    var from = suggestEnd(line.ends[0]), to = suggestEnd(line.ends[1]);
    if (from && to && from.confidence > 0 && to.confidence > 0 && from.shape.attr.id !== to.shape.attr.id) {
      return _.assign(picture.action.mutation(element, line.clone({
        class : 'link',
        from : from.shape.attr.id,
        to : to.shape.attr.id
      }, line instanceof Line ? {
        a1 : Linkline.angle(from.shape, to.shape, from.end),
        a2 : Linkline.angle(to.shape, from.shape, to.end)
      } : { /* Nothing to add for an Arc */ })), {
        confidence : mean([from.confidence, to.confidence])
      });
    } // TODO: sow's ear!
  }
}
