var _ = require('lodash')
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Label = require('../shape/label'),
    Snap = require('snapsvg');

module.exports = function suggestLabel(picture, e1) {
  if (e1 && !e1.removed && !e1.hasClass('label')) {
    return _.last(_.sortBy(_.reduce(picture.paper.selectAll('[id]:not(.label)'), function (candidates, e2) {
      var classified = _.partition([e1, e2], function (e) {
        return e.node.nodeName === 'text';
      }), label = _.first(classified[0]), on = _.first(classified[1]);
      if (label && on) {
        // If the label is wholly within the labelee, we are 90% sure
        var ls = Shape.of(label), les = Shape.of(on);
        var factor = _.every(ls.points, function (p) {
          return Snap.path.isPointInsideBBox(les.bbox, p.x, p.y);
        }) ? 10 : 1;
        return candidates.concat(_.assign(picture.action.mutation(label, ls.clone({
          class : 'label',
          // Don't set the ox and oy, so the user sees the suggestion happening
          // Some kind of animation be cool in future
          on : on.attr('id'),
          // If the labellee is a line, offset a bit
          oy : les.name === 'line' ? new Point(0, 1).transform(les.transform().inverse()).y : 0
        })), {
          confidence : 1 - (ls.bbox.c.distanceFrom(les.bbox.c) / (les.extent * factor))
        }));
      }
      return candidates;
    }, []), 'confidence'));
  }
}
