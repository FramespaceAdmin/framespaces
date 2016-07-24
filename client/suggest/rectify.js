var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    Shape = require('../shape'),
    Point = require('kld-affine').Point2D,
    mean = require('compute-mean');

function d(p1, p2, axis) {
  return Math.abs(p2[axis] - p1[axis]);
}

module.exports = function suggestRectify(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  if ((shape instanceof Polyline || shape instanceof Line) && !shape.hasClass('link')) {
    // Note that rp (rectified points) starts at shape.points[1]
    var rp = _.reduce(_.tail(shape.points), function (rp, p, i) {
      var prev = i ? rp[i - 1].p : shape.points[0],
          dx = d(prev, p, 'x'), dy = d(prev, p, 'y');
      rp.push({
        p : dx > dy ? new Point(p.x, prev.y) : new Point(prev.x, p.y),
        confidence : 1 - (dx > dy ? dy / dx : dx / dy)
      });
      return rp;
    }, []);

    if (!_.isEqual(_.tail(shape.points), _.map(rp, 'p'))) {
      return _.assign(picture.action.mutation(element, shape.delta(shape instanceof Line ? {
        x2 : rp[0].p.x - shape.attr.x2, y2 : rp[0].p.y - shape.attr.y2
      } : {
        points : Shape.pointStr([_.first(shape.points)].concat(_.map(rp, 'p'))),
        class : 'rect' // Upgrades this Polyline to a Rectline, which changes its behaviour
      })), {
        confidence : mean(_.map(rp, 'confidence'))
      });
    }
  }
}
