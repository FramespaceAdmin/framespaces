var _ = require('lodash'),
    _svgp = require('svg-points'),
    as = require('yavl'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape');

function Path(attr) {
  this.path = Path.parse(attr.d);
  Shape.call(this, 'path', attr);
}

Path.PATH = as([{
  x : Number,
  y : Number,
  moveTo : as(undefined, Boolean),
  curve : as(undefined, {
    type : 'arc', rx : Number, ry : Number,
    xAxisRotation : as(undefined, Number),
    sweepFlag : Boolean,
    largeArcFlag : Boolean
  }, {
    type : 'quadratic', x1 : Number, y1 : Number
  }, {
    type : 'cubic', x1 : Number, y1 : Number, x2 : Number, y2 : Number
  })
}]);

Path.parse = function (d) {
  return Path.PATH.cast(_svgp.toPoints({ type : 'path', d : d }));
};

Path.toString = function (path) {
  return _svgp.toPath(_.cloneDeepWith(path, function (v, k) {
    if (/Flag$/.test(k)) {
      return v ? 1 : 0;
    }
  }));
};

Path.prototype = Object.create(Shape.prototype);
Path.prototype.constructor = Path;

Path.prototype.ATTR = Shape.prototype.ATTR.with({ d : String });

Path.prototype.computePoints = function () {
  return _.map(this.path, function (p) {
    return new Point(p.x, p.y);
  });
};

Path.prototype.computeEnds = function () {
  return [_.first(this.getPoints()), _.last(this.getPoints())];
};

Path.prototype.delta = function (dAttr) {
  if (_.has(dAttr, 'd')) {
    if (_.isFunction(dAttr.d)) { // Already a function on the whole path
      dAttr.d = Path.toString(dAttr.d(this.path));
    } else if (_.isObject(dAttr.d)) { // Object path mutators
      dAttr.d = Path.toString(Shape.delta(this.path, dAttr.d));
    }
  }
  return Shape.prototype.delta.call(this, dAttr);
};

module.exports = Path;
