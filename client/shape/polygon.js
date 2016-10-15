var _ = require('lodash'),
    Shape = require('../shape'),
    Polyline = require('./polyline');

function Polygon(attr) {
  Shape.call(this, 'polygon', attr);
}

Polygon.fromJSON = function (data) {
  return data.name === 'polygon' && new Polygon(data.attr);
};

Polygon.fromElement = function (e) {
  return Shape.elementName(e) === 'polygon' && new Polygon(Shape.elementAttr(e));
};

Polygon.prototype = Object.create(Polyline.prototype);
Polygon.prototype.constructor = Polygon;

Shape.closed(Polygon.prototype);

Polygon.prototype.nextPointIndex = function (i) {
  return i < this.points.length - 1 ? i + 1 : 0;
};

Polygon.prototype.prevPointIndex = function (i) {
  return i ? i - 1 : this.points.length - 1;
};

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
