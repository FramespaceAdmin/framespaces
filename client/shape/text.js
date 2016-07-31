var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    _cap = require('svg-intersections');

function Text(attr, spans, bbox) {
  Shape.call(this, 'text', attr, spans, bbox);
}

Text.fromJSON = function (data) {
  return data.name === 'text' &&
    new Text(data.attr, _.map(data.children, Text.Span.fromJSON));
};

Text.of = function (e) {
  return e.node.nodeName === 'text' &&
    new Text(Shape.strongAttr(e), _.map(e.selectAll('tspan'), Text.Span.of), e.getBBox());
};

Text.prototype = Object.create(Shape.prototype);
Text.prototype.constructor = Text;

Text.prototype.computeParams = function () {
  // TODO: letter path
  // CAUTION: This assumes that the bbox is already set via the constructor
  return _cap.shape('rect', this.bbox || {});
}

Text.prototype.delta = function (dAttr) {
  return new Text(this.deltaAttr(dAttr), this.children, this.bbox);
}

Text.prototype.mover = function (isEdge, cursor) {
  return this.resizer(isEdge, cursor) ||
    function (dx, dy) { return this.delta({ x : dx, y : dy }); };
};

Text.prototype.resizer = function (isEdge, cursor) {
  // Scale by bottom-right corner
  if (cursor.contains(new Point(this.bbox.x2, this.bbox.y2))) { // Bottom right corner
    return function (dx, dy) { return this.delta({ 'font-size' : (dx + dy) / 2 }); };
  }
};

Text.Span = function(attr, text, bbox) {
  Shape.call(this, 'tspan', attr, text, bbox);
}

Text.Span.fromJSON = function (data) {
  return data.name ==='tspan' &&
    new Text.Span(data.attr, data.text); // No bbox
};

Text.Span.of = function (e) {
  return e.node.nodeName === 'tspan' &&
    new Text.Span(Shape.strongAttr(e), e.node.childNodes[0].textContent, e.getBBox());
};

Text.Span.prototype = Object.create(Text.prototype);
Text.Span.prototype.constructor = Text.Span;

Text.Span.prototype.delta = function (dAttr) {
  return new Text.Span(this.deltaAttr(dAttr), this.text, this.bbox);
}

module.exports = Text;
