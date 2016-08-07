var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('./polyline'),
    Line = require('./line'),
    Point = require('kld-affine').Point2D,
    _cap = require('svg-intersections');

function Polygon(attr) {
  Shape.call(this, 'polygon', attr);
}

Polygon.fromJSON = function (data) {
  return data.name === 'polygon' && new Polygon(data.attr);
};

Polygon.of = function (e) {
  return e.node.nodeName === 'polygon' && new Polygon(Shape.strongAttr(e));
};

Polygon.prototype = Object.create(Shape.prototype);
Polygon.prototype.constructor = Polygon;

Polygon.prototype.mover = Polyline.prototype.mover; // TODO: No good when dragging first/last point

Polygon.prototype.minus = function (that) {
  var fragments = Polyline.pointsMinus(this.points.concat(_.first(this.points)), that),
      first = _.first(fragments), last = _.last(fragments);

  if (first && _.first(_.get(first, 'points')).equals(_.last(_.get(last, 'points')))) {
    if (fragments.length === 1) {
      return [this];
    } else {
      return fragments.slice(1, fragments.length - 1).concat(last.add(first));
    }
  } else {
    return fragments;
  }
};

module.exports = Polygon;
