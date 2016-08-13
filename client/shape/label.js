var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Text = require('./text');

function Label(attr, spans, bbox) {
  // Allow attr to not have its x and y position specified
  Text.call(this, Shape.deltaAttr(_.defaults(attr, { x : 0, y : 0 }), { class : 'label' }), spans, bbox);
}

Label.fromJSON = function (data) {
  return data.name === 'text' && Shape.hasClass(data.attr, 'label') &&
    new Label(data.attr, _.map(data.children, Text.Span.fromJSON));
};

Label.of = function (e) {
  return e.node.nodeName === 'text' && e.hasClass('label') &&
    new Label(Shape.strongAttr(e), _.map(e.selectAll('tspan'), Text.Span.of), e.getBBox());
};

Label.prototype = Object.create(Text.prototype);
Label.prototype.constructor = Label;

Label.prototype.label = function (on) {
  var matrix = this.transform(on.transform()),
      offset = new Point(this.attr.ox || 0, this.attr.oy || 0).transform(matrix);

  return this.clone({
    x : on.bbox.cx - this.bbox.width/2 + offset.x,
    // NOTE y position of text is the baseline of the first line
    y : on.bbox.cy - this.bbox.height/2 + this.attr['font-size'] + offset.y,
    on : on.attr.id
  });
};

Label.prototype.mover = function (isEdge, cursor, getShapeById) {
  return this.resizer(isEdge, cursor) || this.offsetter(isEdge, cursor, getShapeById);
};

Label.prototype.offsetter = function (isEdge, cursor, getShapeById) {
  if (!isEdge) {
    // ox and oy are transformed relative offsets from labelled shape centre
    var on = getShapeById && getShapeById(this.attr.on),
        matrix = on && this.transform(on.transform()).inverse();
    return matrix && function (dx, dy) {
      var offset = new Point(dx, dy).transform(matrix);
      return this.delta({ ox : offset.x, oy : offset.y }).label(on);
    };
  }
};

module.exports = Label;
