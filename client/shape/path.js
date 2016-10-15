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
    type : 'arc',
    rx : Number,
    ry : Number,
    xAxisRotation : as(undefined, Number),
    sweepFlag : Boolean,
    largeArcFlag : Boolean
  }, {
    type : 'quadratic',
    x1 : Number,
    y1 : Number
  }, {
    type : 'cubic',
    x1 : Number,
    y1 : Number,
    x2 : Number,
    y2 : Number
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

Path.delta = function (deltas) {
  return function (d) {
    return Path.toString(_.reduce(deltas, function (path, delta, key) {
      return _.update(path, key, _.isNumber(delta) ? function (v) {
        return (v || 0) + delta;
      } : _.isFunction(delta) ? delta : _.constant(delta));
    }, Path.parse(d)));
  };
};

Path.clone = function (path) {
  return Path.delta(_.mapValues(path, _.constant));
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
  return [_.first(this.points), _.last(this.points)];
};

module.exports = Path;
