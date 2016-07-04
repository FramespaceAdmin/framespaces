var _ = require('lodash')
    Point = require('kld-affine').Point2D,
    Line = require('../shape/line'),
    Shape = require('../shape'),
    _stat = require('jstat').jStat;

module.exports = function suggestLink(picture, line) {
  var shape = line && !line.removed && Shape.of(line);
  if (shape && shape instanceof Line && !shape.hasClass('link')) {
    // Look for candidate circles and rectangles to connect
    var begin = _.first(shape.points), end = _.last(shape.points),
        elements = picture.paper.selectAll('rect,circle');

    if (elements.length) {
      function suggestEnd(point) {
        return _.last(_.sortBy(_.reduce(elements, function (results, e) {
          // If the point is actually in the bbox, we are 90% sure
          var bbox = e.getBBox(), factor = Snap.path.isPointInsideBBox(bbox, point.x, point.y) ? 10 : 1;
          return results.concat([{
            confidence : 1 - (Math.abs(point.x - bbox.x) / (bbox.width * factor)), e : e
          }, {
            confidence : 1 - (Math.abs(point.y - bbox.y) / (bbox.height * factor)), e : e
          }, {
            confidence : 1 - (Math.abs(point.x - bbox.x2) / (bbox.width * factor)), e : e
          }, {
            confidence : 1 - (Math.abs(point.y - bbox.y2) / (bbox.height * factor)), e : e
          }]);
        }, []), 'confidence'));
      }
      var from = suggestEnd(begin), to = suggestEnd(end);
      if (from.e !== to.e) {
        return _.assign(picture.action.mutation(line, shape.delta({
          from : from.e.attr('id'),
          to : to.e.attr('id'),
          class : 'link'
        })), {
          confidence : _stat.mean([from.confidence, to.confidence])
        });
      } // TODO: sow's ear!
    }
  }
}
