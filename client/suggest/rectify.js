var _ = require('lodash'),
    Polyline = require('../shape/polyline'),
    Line = require('../shape/line'),
    Rect = require('../shape/rect'),
    Shape = require('../shape'),
    Removal = require('../action/removal'),
    Addition = require('../action/addition'),
    Mutation = require('../action/mutation'),
    Point = require('kld-affine').Point2D;

function d(p1, p2, axis) {
  return Math.abs(p2[axis] - p1[axis]);
}

module.exports = function suggestRectify(picture, lastAction) {
  var element = _.last(lastAction.results), shape = Shape.ofAttached(element);
  function createAction(points) {
    if (!shape.getEnds().length && points.length === 4) {
      return new Removal(shape).and(new Addition(shape.cloneAs('rect', Shape.computeBBox(points))));
    } else {
      return new Mutation(shape, shape.delta(shape instanceof Line ? {
        x2 : points[1].x - shape.attr.x2, y2 : points[1].y - shape.attr.y2
      } : {
        points : Polyline.pointStr(points)
      }));
    }
  }

  if ((shape instanceof Polyline || shape instanceof Line) && !shape.hasClass('link')) {
    var rp = _.reduce(shape.getPoints(), function (rp, p, i) {
      var prev = shape.getPoints()[shape.prevPointIndex ? shape.prevPointIndex(i) : i - 1];
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

    if (!_.isEqual(shape.getPoints(), _.map(rp, 'p'))) {
      return _.assign(createAction(_.map(rp, 'p')), {
        confidence : _.mean(_.map(rp, 'confidence'))
      });
    }
  }
}
