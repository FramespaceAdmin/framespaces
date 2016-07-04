var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('./polyline'),
    Point = require('kld-affine').Point2D,
    _cap = require('svg-intersections');

function Polygon(attr) {
  Shape.call(this, 'polygon', attr);
}

Polygon.fromJSON = function (data) {
  return data.name === 'polygon' && new Polygon(data.attr);
};

Polygon.of = function (e) {
  return e.node.nodeName === 'polygon' && new Polygon(Shape.nodeAttr(e));
};

Polygon.prototype = Object.create(Shape.prototype);
Polygon.prototype.constructor = Polygon;

Polygon.prototype.computeParams = Polyline.prototype.computeParams;
Polygon.prototype.mover = Polyline.prototype.mover;

module.exports = Polygon;
