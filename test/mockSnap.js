var _ = require('lodash');

require('jsdom-global')();
var Snap = require('snapsvg');

function MockSnap() {
  var paper = Snap.apply(this, arguments);

  function bbox(/*points*/) {
    var points = _.chunk(_.toArray(arguments), 2),
        xs = _.map(points, _.first), ys = _.map(points, _.last),
        x = _.min(xs), y = _.min(ys);
    return { x : x, y : y, height : _.max(ys) - y, width : _.max(xs) - x };
  }

  var snapEl = paper.el;

  return _.assign(paper, {
    el : function (name, attr) {
      return _.assign(snapEl.call(paper, name, attr), {
        /*
         * jsdom has no layout support
         * So we need to polyfill any element methods that require it for example, getBBox()
         */
        getBBox : function () {
          switch (name) {
            case 'line': return bbox(attr.x1, attr.y1, attr.x2, attr.y2);
            case 'polyline': return bbox.apply(null, attr.points);
            case 'rect': return bbox(attr.x, attr.y, attr.x + attr.width, attr.y + attr.height);
            default: throw new Error('element not supported in mock paper');
          }
        },
        /*
         * jsdom does not support SVGAnimatedString, so re-implement class manipulation
         */
        hasClass : function (c) {
          return this.node.classList.contains(c);
        },
        addClass : function (c) {
          this.node.classList.add(c);
          return this;
        }
      });
    }
  });
}

module.exports = MockSnap;
