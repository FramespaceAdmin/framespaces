var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Removal = require('../action/removal'),
    Replacement = require('../action/replacement'),
    Point = require('kld-affine').Point2D;

function getConfidence(p1, p2, s1, s2) {
  return 1 - p1.distanceFrom(p2) / (s1.getExtent() + (s2 ? s2.getExtent() : 0));
}

module.exports = function suggestSnap(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape.getEnds().length) {
    var reverseShape = _.invoke(shape, 'reverse'), snaps = [];

    if (shape.close) {
      snaps.push(_.assign(new Replacement(shape, shape.close()), {
        confidence : getConfidence(shape.getEnds()[0], shape.getEnds()[1], shape)
      }));
    }
    picture.paper.selectAll('[id]:not(#' + shape.attr.id + ')').forEach(function (oldElement) {
      function pushSnap(sNew, sOld) {
        if (sNew && sOld && sOld.add) {
          var sFinal = sOld.add(sNew); // carrying forward old shape
          if (sFinal) {
            snaps.push(_.assign(new Removal(shape).and(new Replacement(oldShape, sFinal)), {
              confidence : getConfidence(sNew.getEnds()[0], sOld.getEnds()[1], sNew, sOld)
            }));
          }
        }
      }
      var oldShape = Shape.of(oldElement), reverseOldShape = _.invoke(oldShape, 'reverse');
      pushSnap(shape, oldShape);
      pushSnap(shape, reverseOldShape);
      pushSnap(reverseShape, oldShape);
      pushSnap(reverseShape, reverseOldShape);
    });

    return _.maxBy(snaps, 'confidence');
  }
}
