var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D;

function getConfidence(p1, p2, s1, s2) {
  return 1 - p1.distanceFrom(p2) / (s1.extent + (s2 ? s2.extent : 0));
}

module.exports = function suggestSnap(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape && shape.ends.length) {
    var reverseShape = _.invoke(shape, 'reverse'), snaps = [];

    if (shape.close) {
      snaps.push(_.assign(picture.action.replacement(element, shape.close()), {
        confidence : getConfidence(shape.ends[0], shape.ends[1], shape)
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
              confidence : getConfidence(sNew.ends[0], sOld.ends[1], sNew, sOld)
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
