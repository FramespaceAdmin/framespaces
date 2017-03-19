var _ = require('lodash'),
    as = require('yavl'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    _cap = require('svg-intersections');

function Text(attr, content, bbox) {
  Shape.call(this, 'text', attr, content, bbox);
}

Text.fromJSON = function (data) {
  return data.name === 'text' &&
    new Text(data.attr, _.map(data.children, Text.Span.fromJSON), data.bbox);
};

Text.fromElement = function (e) {
  return Shape.elementName(e) === 'text' && (function (node, bbox) {
    var tspans = node.querySelectorAll('tspan'),
        content = tspans.length ? _.map(tspans, Text.Span.fromElement) : node.textContent;
    return new Text(Text.elementAttr(e), content, bbox);
  })(e.node|| e, e.getBBox());
};

Text.elementAttr = function (e) {
  var attr = Shape.elementAttr(e);
  // Grab a font-size inline style attribute, if in pixels
  var fsStr = attr['font-size'] || (e.node || e).style.getPropertyValue('font-size'),
      fsParts = fsStr && /([0-9\.]+)(\w{2})?/.exec(fsStr);
  if (fsParts && (!fsParts[2] || fsParts[2] === 'px')) {
    attr['font-size'] = Number(fsParts[1]);
  };
  return attr;
};

Text.prototype = Object.create(Shape.prototype);
Text.prototype.constructor = Text;

Text.prototype.ATTR = Shape.prototype.ATTR.with({
  x : Number,
  y : Number,
  'font-size' : as(undefined, Number) // Pixel font size, see Text.elementAttr
});

Text.prototype.computeParams = function () {
  // TODO: letter path
  // CAUTION: This assumes that the bbox is already set via the constructor
  return _cap.shape('rect', this.getBBox() || {});
}

Text.prototype.transform = function (matrix) {
  var p = new Point(this.attr.x, this.attr.y).transform(matrix), s = matrix.getScale();
  return this.clone({ x : p.x, y : p.y, 'font-size' : this.attr['font-size'] * Math.min(s.scaleX, s.scaleY) });
};

Text.prototype.mover = function (isEdge, cursor) {
  return this.resizer(isEdge, cursor) ||
    function (dx, dy) { return this.delta({ x : dx, y : dy }); };
};

Text.prototype.resizer = function (isEdge, cursor) {
  // Scale by bottom-right corner
  if (cursor.contains(new Point(this.getBBox().x2, this.getBBox().y2))) { // Bottom right corner
    return function (dx, dy) { return this.delta({ 'font-size' : (dx + dy) / 2 }); };
  }
};

Text.Span = function(attr, text, bbox) {
  Shape.call(this, 'tspan', attr, text, bbox);
}

Text.Span.fromJSON = function (data) {
  return data.name ==='tspan' &&
    new Text.Span(data.attr, data.text, data.bbox);
};

Text.Span.fromElement = function (e) {
  return Shape.elementName(e) === 'tspan' &&
    new Text.Span(Shape.elementAttr(e), (e.node || e).textContent, e.getBBox());
};

Text.Span.prototype = Object.create(Text.prototype);
Text.Span.prototype.constructor = Text.Span;

Text.Span.prototype.ATTR = Shape.prototype.ATTR.with({
  // tspans start life with no attributes
  x : as(undefined, Number),
  y : as(undefined, Number)
});

Text.Span.prototype.delta = function (dAttr) {
  return new Text.Span(this.deltaAttr(dAttr), this.text, this.getBBox());
}

module.exports = Text;
