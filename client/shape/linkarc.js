var _ = require('lodash'),
    Shape = require('../shape'),
    Arc = require('./arc'),
    _kld = require('kld-affine'),
    Point = _kld.Point2D;

function Linkarc(attr) {
  // Allow attr to not have its start and end points specified
  Arc.call(this, Shape.deltaAttr({ class : 'link' }));
}

Linkarc.fromJSON = function (data) {
  return data.name === 'path' && Arc.isArc(data.attr.d) && Shape.hasClass(data.attr, 'link') && new Linkarc(data.attr);
};

Linkarc.of = function (e) {
  return e.node.nodeName === 'path' && Arc.isArc(e.attr('d')) && e.hasClass('link') && new Linkarc(Shape.strongAttr(e));
};

Linkarc.prototype = Object.create(Arc.prototype);
Linkarc.prototype.constructor = Linkarc;

Linkarc.prototype.link = function (from, to) {
  // Construct an arc to traverse c1, c2 and the offset centre


  var p1 = end(from, to, this.attr.a1), p2 = end(to, from, this.attr.a2);
  return this.clone({
    x1 : p1.x, y1 : p1.y,
    x2 : p2.x, y2 : p2.y,
    from : from.attr.id,
    to : to.attr.id
  });
};

Linkarc.prototype.mover = function (isEdge, cursor, getShapeById) {
};

module.exports = Linkarc;
