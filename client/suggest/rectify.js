var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    Rect = require('../shape/rect'),
    Shape = require('../shape'),
    Replacement = require('../action/replacement'),
    Mutation = require('../action/mutation'),
    Point = require('kld-affine').Point2D;

function d(p1, p2, axis) {
  return Math.abs(p2[axis] - p1[axis]);
}

module.exports = function suggestRectify(picture, element) {
  var shape = element && !element.removed && Shape.of(element);
  function createAction(points) {
    if (!shape.ends.length && points.length === 4) {
      return new Replacement(shape, shape.cloneAs('rect', Shape.computeBBox(points)));
    } else {
      return new Mutation(shape, shape.delta(shape instanceof Line ? {
        x2 : points[1].x - shape.attr.x2, y2 : points[1].y - shape.attr.y2
      } : {
        points : Polyline.pointStr(points)
      }));
    }
  }

  if ((shape instanceof Polyline || shape instanceof Line) && !shape.hasClass('link')) {
    var rp = _.reduce(shape.points, function (rp, p, i) {
      var prev = shape.points[shape.prevPointIndex ? shape.prevPointIndex(i) : i - 1];
      if (prev) {
        var dx = d(prev, p, 'x'), dy = d(prev, p, 'y');
        rp.push({
          p : dx > dy ? new Point(p.x, prev.y) : new Point(prev.x, p.y),
          confidence : 1 - (dx > dy ? dy / dx : dx / dy)
        });
      } else {
        rp.push({ p : p, confidence : 1 }); // Don't change the first point if this is an open shape
      }
      return rp;
    }, []);

    if (!_.isEqual(shape.points, _.map(rp, 'p'))) {
      return _.assign(createAction(_.map(rp, 'p')), {
        confidence : _.mean(_.map(rp, 'confidence'))
      });
    }
  }
}
