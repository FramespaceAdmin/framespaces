var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Removal = require('../action/removal'),
    Addition = require('../action/addition'),
    Point = require('kld-affine').Point2D;

function getConfidence(p1, p2, s1, s2) {
  return 1 - p1.distanceFrom(p2) / (s1.getExtent() + (s2 ? s2.getExtent() : 0));
}

module.exports = function suggestSnap(picture, lastAction) {
  var element = _.last(lastAction.results), shape = Shape.ofAttached(element);
  if (shape && shape.getEnds().length) {
    var reverseShape = _.invoke(shape, 'reverse'), snaps = [];

    if (shape.close) {
      snaps.push(new Removal(shape).and(new Addition(shape.close()), {
        confidence : getConfidence(shape.getEnds()[0], shape.getEnds()[1], shape)
      }));
    }
    picture.paper.select('[id]:not(#' + shape.attr.id + ')').each(function () {
      function pushSnap(sNew, sOld) {
        if (sNew && sOld && sOld.add) {
          var sFinal = sOld.add(sNew); // carrying forward old shape
          if (sFinal) {
            snaps.push(new Removal(shape).and(new Removal(oldShape)).and(new Addition(sFinal), {
              confidence : getConfidence(sNew.getEnds()[0], sOld.getEnds()[1], sNew, sOld)
            }));
          }
        }
      }
      var oldShape = Shape.of(this), reverseOldShape = _.invoke(oldShape, 'reverse');
      pushSnap(shape, oldShape);
      pushSnap(shape, reverseOldShape);
      pushSnap(reverseShape, oldShape);
      pushSnap(reverseShape, reverseOldShape);
    });

    return _.maxBy(snaps, 'confidence');
  }
}
