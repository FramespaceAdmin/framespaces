var _ = require('lodash');

require('jsdom-global')();
var Snap = require('snapsvg');

function bbox(/*points*/) {
  // Be very permissive about numbers for sanity's sake
  var points = _.chunk(_.map(_.toArray(arguments), function (n) { return Number(n) || 0; }), 2),
      xs = _.map(points, 0), ys = _.map(points, 1),
      x = _.min(xs), y = _.min(ys);
  return { x : x, y : y, height : _.max(ys) - y, width : _.max(xs) - x };
}

function getBBox(type, attr, node) {
  switch (type) {
    case 'line' : return bbox(attr.x1, attr.y1, attr.x2, attr.y2);
    case 'polyline' : return bbox.apply(null, attr.points.split(/,\s*/));
    case 'rect' : return bbox(attr.x, attr.y, attr.x + attr.width, attr.y + attr.height);
    case 'text' : return bbox(attr.x, attr.y, attr.x + node.textContent.length, attr.y + 0.5);
    case 'tspan' : return bbox(attr.x, attr.y, attr.x + node.textContent.length, attr.y + 0.5);
    default: throw new Error('element ' + type + ' not supported in mock paper');
  }
}

Snap.plugin(function (Snap, Element, Paper, global, Fragment) {
    _.assign(Element.prototype, {
      /*
      * jsdom has no layout support.
      * So we need to polyfill any element methods that require it.
      * For example getBBox() is required on both the node (SVGLocatable) and the Snap element.
      * NOTE we only go one level deep, minimal viable for unit tests
      */
      getBBox : function () {
        return getBBox(this.type, this.attr(), this.node);
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
    var superEl = Paper.prototype.el;
    Paper.prototype.el = function (name, attr) {
      var element = superEl.apply(this, arguments);
      _.each(_.concat(element, element.children()), function (el) {
        el.node.getBBox = _.bind(el.getBBox, el);
      });
      return element;
    };
});

function MockPaper() {
  var paper = Snap.apply(this, arguments);
  paper.select('desc').remove(); // Added by Snap
  paper.select('defs').remove(); // Added by Snap
  return paper;
}

module.exports = MockPaper;
