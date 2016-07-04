var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Text = require('./text');

function Label(text, on) {
  var matrix = text.transform(on.transform()),
      offset = new Point(text.attr.ox || 0, text.attr.oy || 0).transform(matrix);

  Text.call(this, _.defaults({
    x : on.bbox.cx - text.bbox.width/2 + offset.x,
    // NOTE y position of text is the baseline of the first line
    y : on.bbox.cy - text.bbox.height/2 + text.attr['font-size'] + offset.y,
    'font-size' : text.attr['font-size']
  }, text.deltaAttr({ class : 'label' })), text.children, text.bbox);
}

// Support Text constructor arguments for private use (see Label.fromJSON & Label.of)
function _Label() {
  Text.apply(this, arguments);
}

Label.fromJSON = function (data) {
  return data.name === 'text' && Shape.hasClass(data.attr, 'label') &&
    new _Label(data.attr, _.map(data.children, Text.Span.fromJSON));
};

Label.of = function (e) {
  return e.node.nodeName === 'text' && e.hasClass('label') &&
    new _Label(Shape.nodeAttr(e), _.map(e.selectAll('tspan'), Text.Span.of), e.getBBox());
};

Label.prototype = _Label.prototype = Object.create(Text.prototype);
Label.prototype.constructor = Label;

Label.prototype.delta = function (dAttr) {
  return new _Label(this.deltaAttr(dAttr), this.children, this.bbox);
};

Label.prototype.mover = function (isEdge, cursor, getShapeById) {
  return this.resizer(isEdge, cursor) || this.offsetter(isEdge, cursor, getShapeById);
};

Label.prototype.offsetter = function (isEdge, cursor, getShapeById) {
  if (!isEdge) {
    // ox and oy are transformed relative offsets from labelled shape centre
    var labelled = getShapeById && getShapeById(this.attr.on),
        matrix = labelled && this.transform(labelled.transform()).inverse();
    return matrix && function (dx, dy) {
      var offset = new Point(dx, dy).transform(matrix);
      return this.delta({ ox : offset.x, oy : offset.y });
    };
  }
};

module.exports = Label;
