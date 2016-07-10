var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    _stat = require('jstat').jStat;

module.exports = function suggestSnap(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if (shape) {
    var reverseShape = _.invoke(shape, 'reverse'), snaps = [];

    if (shape.close) {
      snaps.push(_.assign(picture.action.replacement(element, shape.close()), {
        confidence : 1 - (_.first(shape.points).distanceFrom(_.last(shape.points)) / shape.extent)
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
              confidence : 1 - (_.first(sNew.points).distanceFrom(_.last(sOld.points)) / (sNew.extent + sOld.extent))
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
