var _ = require('lodash'),
    as = require('yavl'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Text = require('./text');

function Label(attr, spans, bbox) {
  // Allow attr to not have its x and y position specified
  Text.call(this, Shape.delta(_.defaults(attr, { x : 0, y : 0 }), { class : 'label' }), spans, bbox);
}

Label.fromJSON = function (data) {
  return data.name === 'text' && Shape.hasClass(data.attr, 'label') &&
    new Label(data.attr, _.map(data.children, Text.Span.fromJSON), data.bbox);
};

Label.fromElement = function (e) {
  return Shape.elementName(e) === 'text' && (function (attr) {
    return Shape.hasClass(attr, 'label') &&
      new Label(attr, _.map(Shape.elementSelectAll(e, 'tspan'), Text.Span.fromElement), Shape.elementBBox(e));
  })(Text.elementAttr(e));
};

Label.prototype = Object.create(Text.prototype);
Label.prototype.constructor = Label;

Label.prototype.ATTR = Text.prototype.ATTR.with({
  on : String, // id of the labellee
  ox : as(undefined, Number), // x offset from labelee
  oy : as(undefined, Number) // y offset from labelee
});

Label.prototype.offsetMatrix = function (on) {
  return this.scale(this.rotation(on.scale(on.rotation())));
};

Label.prototype.label = function (on) {
  var matrix = this.offsetMatrix(on),
      offset = new Point(this.attr.ox || 0, this.attr.oy || 0).transform(matrix);

  return this.clone({
    x : on.getBBox().cx - this.getBBox().width/2 + offset.x,
    // NOTE y position of text is the baseline of the first line
    y : on.getBBox().cy - this.getBBox().height/2 + this.attr['font-size'] + offset.y,
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
        matrix = on && this.offsetMatrix(on).inverse();
    return matrix && function (dx, dy) {
      var offset = new Point(dx, dy).transform(matrix);
      return this.delta({ ox : offset.x, oy : offset.y }).label(on);
    };
  }
};

module.exports = Label;
