var _ = require('lodash'),
    _svgp = require('svg-points'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape');

function Path(attr) {
  this.path = Path.parse(attr.d);
  Shape.call(this, 'path', attr);
}

Path.parse = function (d) {
  return _.cloneDeepWith(_svgp.toPoints({ type : 'path', d : d }), function normalise(v, k) {
    switch (k) {
      case 'curve':
        return _.cloneDeepWith(v.type === 'arc' ? _.defaults(v, {
          sweepFlag : false, largeArcFlag : false
        }) : v, normalise);
      case 'sweepFlag':
      case 'largeArcFlag':
        return Boolean(v);
    }
  });
};

Path.toString = function (path) {
  var svgp = _.cloneDeepWith(path, function (v, k) {
    switch (k) {
      case 'sweepFlag':
      case 'largeArcFlag':
        return v ? 1 : 0;
    }
  });
  return _svgp.toPath(svgp);
};

Path.prototype = Object.create(Shape.prototype);
Path.prototype.constructor = Path;

Path.prototype.computePoints = function () {
  return _.map(this.path, function (p) {
    return new Point(p.x, p.y);
  });
};

Path.prototype.computeEnds = function () {
  return [_.first(this.points), _.last(this.points)];
};

Path.prototype.deltaD = function (deltas) {
  return this.delta({ d : Path.toString(_.reduce(deltas, function (path, delta, key) {
    return _.update(path, key, _.isNumber(delta) ? function (v) {
      return (v || 0) + delta;
    } : _.isFunction(delta) ? delta : _.constant(delta));
  }, this.path)) });
};

module.exports = Path;
