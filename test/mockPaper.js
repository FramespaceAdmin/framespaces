var _ = require('lodash');

require('jsdom-global')();
var Snap = require('snapsvg');

function MockPaper() {
  var paper = Snap.apply(this, arguments);

  function bbox(/*points*/) {
    var points = _.chunk(_.toArray(arguments), 2),
        xs = _.map(points, 0), ys = _.map(points, 1),
        x = _.min(xs), y = _.min(ys);
    return { x : x, y : y, height : _.max(ys) - y, width : _.max(xs) - x };
  }

  var snapEl = paper.el;
  paper.el = function (name, attr) {
    var e = snapEl.call(paper, name, attr);
    function getBBox() {
      switch (name) {
        case 'line' : return bbox(attr.x1, attr.y1, attr.x2, attr.y2);
        case 'polyline' : return bbox.apply(null, attr.getPoints());
        case 'rect' : return bbox(attr.x, attr.y, attr.x + attr.width, attr.y + attr.height);
        case 'text' : return bbox(attr.x, attr.y, attr.x + (this.node || this).textContent.length, attr.y + 0.5);
        default: throw new Error('element not supported in mock paper');
      }
    };
    /*
     * jsdom has no layout support.
     * So we need to polyfill any element methods that require it.
     * For example getBBox() is required on both the node (SVGLocatable) and the Snap element.
     * NOTE we only go one level deep, minimal viable for unit tests
     */
    _.each([e, e.node].concat(_.toArray(e.node.children)), _.partialRight(_.assign, { getBBox : getBBox }));
    return _.assign(e, {
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
  };
  return paper;
}

module.exports = MockPaper;
