var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D;

var GAP_FACTOR = 0.1; // Magic number, ideal ratio of gap to point-adjusted shape extent

function getConfidence(p1, p2, s1, s2) {
  var d = p1.distanceFrom(p2),
      extent = s1.extent + (s2 ? s2.extent : 0),
      count = s1.points.length + (s2 ? s2.points.length : 0);
  return 1 - (d / (extent / count)) * GAP_FACTOR;
}

module.exports = function suggestSnap(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape) {
    var reverseShape = _.invoke(shape, 'reverse'), snaps = [];

    if (shape.close) {
      snaps.push(_.assign(picture.action.replacement(element, shape.close()), {
        confidence : getConfidence(_.first(shape.points), _.last(shape.points), shape)
      }));
    }
    picture.paper.selectAll('[id]:not(#' + shape.attr.id + ')').forEach(function (oldElement) {
      var removeNew = picture.action.removal(element), // Removing the newer element
          replaceOldWith = _.bind(picture.action.replacement, picture.action, oldElement); // Replacing the older
      function pushSnap(sNew, sOld) {
        if (sNew && sOld && sOld.add) {
          var sFinal = sOld.add(sNew); // carrying forward old shape
          if (sFinal) {
            snaps.push(_.assign(removeNew.and(replaceOldWith(sFinal)), {
              confidence : getConfidence(_.first(sNew.points), _.last(sOld.points), sNew, sOld)
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
