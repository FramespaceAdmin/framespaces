var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Polygon = require('../shape/polygon'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    _stat = require('jstat').jStat;

function assignConfidence(action, p1, p2, extent) {
  return _.assign(action, {
    confidence : 1 - (p1.distanceFrom(p2) / extent)
  });
}

module.exports = function suggestSnap(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if ((shape instanceof Polyline || shape instanceof Line) && !shape.hasClass('link')) {
    var begin = _.first(shape.points), end = _.last(shape.points);

    return _.maxBy(_.reduce(picture.paper.selectAll('polyline,line'), function (snaps, e2) {
      if (element === e2) {
        snaps.push(assignConfidence(picture.action.replacement(element, new Polygon({
          points : Shape.pointStr(_.initial(shape.points))
        })), begin, end, shape.extent));
      } else {
        var s2 = Shape.of(e2), begin2 = _.first(s2.points), end2 = _.last(s2.points),
            extent = shape.extent + s2.extent, removal = picture.action.removal(element);

        function addSnap(p1, p2, finalPoints) {
          snaps.push(assignConfidence(removal.and(picture.action.replacement(e2, new Polyline({
            points : Shape.pointStr(finalPoints)
          }))), p1, p2, extent));
        }

        addSnap(begin, end2, s2.points.concat(_.tail(shape.points)));
        addSnap(end, end2, s2.points.concat(_.reverse(_.initial(shape.points))));
        addSnap(begin, begin2, _.reverse(_.tail(shape.points)).concat(s2.points));
        addSnap(end, begin2, _.initial(shape.points).concat(s2.points));
      }
      return snaps;
    }, []), 'confidence');
  }
}
