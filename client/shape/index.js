var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Matrix = require('kld-affine').Matrix2D,
    Vector = require('kld-affine').Vector2D,
    _cap = require('svg-intersections'),
    NUMERIC_ATTR = /^([xyr]|[orcd][xy]|[xya][12]|width|height|font-size)$/,
    STRING_ATTR = /^(points|d|id|from|to|on|class)$/,
    NUMERIC_STYLE_ATTR = /^(font-size)$/;

/**
 * A shape is an abstract immutable representation of an svg element.
 * Constructor takes an SVG node name, attributes, children and bbox.
 * Children can be an array of child shapes or a single string (no mixed nodes).
 * Children and bbox are optional.
 */
function Shape(name, attr, children, bbox) {
  if (this.constructor === Shape) {
    throw new Error("Can't instantiate abstract class!");
  }

  // Basic properties
  this.name = name;
  this.attr = attr;
  this.text = _.isString(children) ? children : undefined;
  this.children = _.isArray(children) ? children : undefined;
  this.bbox = bbox && strongBBox(bbox);

  // Computed properties
  this.params = this.computeParams();
  this.points = _.map(this.computePoints(), strongPoint);
  this.ends = this.computeEnds ? this.computeEnds() : [];
  this.bbox = this.bbox || strongBBox(this.computeBBox());
  this.extent = this.computeExtent();
}

/**
 * All the Shapes in the world.
 * Ensure specialised come before generalised. TODO: Make this automatic.
 */
Shape.constructors = _.once(function () {
  return [
    require('./circle'),
    require('./ellipse'),
    require('./arc'),
    require('./label'), // Before text
    require('./linkline'), // Before line
    require('./line'),
    require('./polyline'),
    require('./polygon'),
    require('./rect'),
    require('./text'),
    require('./text').Span
  ];
});

/**
 * Mixin for closed shapes (implement/override these methods for open shapes)
 */
Shape.closed = function (prototype) {
  /**
   * Returns a pair (array) with the ends of an open shape.
   * Called after the points have been computed.
   */
  prototype.computeEnds = undefined;

  /**
   * If truthy, then a function that closes an open shape
   * @returns a closed shape
   */
  prototype.close = undefined;

  /**
   * If truthy, then a function that reverses this shape
   * @returns the same shape with the ends reversed
   */
  prototype.reverse = undefined;

  /**
   * If truthy, then a function that adds the other shape onto this shape
   * @param that a shape to add
   * @returns a compound shape, begin = this.begin, end = that.end
   */
  prototype.add = undefined;
};

/**
 * Returns JSONable data for this Shape
 */
Shape.prototype.toJSON = function () {
  var json = _.pick(this, 'name', 'attr', 'text');
  if (this.children) {
    json.children = _.map(this.children, _.method('toJSON'));
  }
  return json;
};

/**
 * Creates a shape from serial data
 */
Shape.fromJSON = function (data) {
  return _.reduce(Shape.constructors(), function (shape, constructor) {
    return shape || constructor.fromJSON(data);
  }, null);
}

/**
 * Gets a shape for the given Snap SVG element
 */
Shape.of = function (element) {
  return _.reduce(Shape.constructors(), function (shape, constructor) {
    return shape || constructor.of(element);
  }, null);
};

/**
 * Default params computation. Override to specialise.
 * This is for the svg-intersections library.
 */
Shape.prototype.computeParams = function () {
  return _cap.shape(this.name, this.attr);
};

/**
 * Default points computation. Override to specialise.
 * This is the points that make up the shape.
 * Called after params have been computed.
 */
Shape.prototype.computePoints = function () {
  return this.params.params[0];
};

/**
 * Default bbox computation. Override to specialise.
 * Return must have x, y, width & height. May also have other parameters.
 * Called after points have been computed.
 */
Shape.prototype.computeBBox = function () {
  return Shape.computeBBox(this.points);
};

/**
 * Utility bbox computation for an array of points.
 */
Shape.computeBBox = function(points) {
  var xs = _.map(points, 'x'), ys = _.map(points, 'y'), x = _.min(xs), y = _.min(ys);
  return { x : x, y : y, width : _.max(xs) - x, height : _.max(ys) - y };
};

/**
 * Default extent computation. Override to specialise.
 * This is a scalar indication of the extent of the shape.
 * Called after bbox has been computed.
 */
Shape.prototype.computeExtent = function () {
  return new Point(0, 0).distanceFrom(new Point(this.bbox.w, this.bbox.h)); // diagonal
};

/**
 * Default transform computation. Override to specialise.
 * This is a function to return a matrix that represents the shapes size and orientation.
 */
Shape.prototype.transform = function (m) {
  // Most shapes are only rotated if they have a transform (TODO)
  return (m || Matrix.IDENTITY).scaleNonUniform(this.bbox.w, this.bbox.h);
};

/**
 * returns an array of intersection Points with the given shape
 */
Shape.prototype.intersect = function (that) {
  return _cap.intersect(this.params, that.params).points || [];
};

/**
 * returns truthy if the shape contains the point.
 * The default behaviour uses the Jordan curve theorem per
 * https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 */
Shape.prototype.contains = function (point) {
  var ray = _cap.shape('line', { x1 : this.bbox.x, y1 : this.bbox.y, x2 : point.x, y2 : point.y }),
      intersects = _cap.intersect(this.params, ray).points;

  return !intersects || intersects.length % 2;
};

/**
 * returns a new shape with attributes changed by the given deltas, @see Shape.prototype.deltaAttr.
 * Default implementation assumes a one-arg constructor.
 */
Shape.prototype.delta = function (dAttr) {
  return new (this.constructor)(this.deltaAttr(dAttr));
};

/**
 * Clones this shape with the given optional additional attributes
 */
Shape.prototype.clone = function (attr/*, ...*/) {
  return this.cloneAs(this.constructor, _.isArray(attr) ? attr : _.toArray(arguments));
};

/**
 * returns a new shape of the given type, optionally with new attributes as given.
 * Default implementation assumes a one-arg constructor.
 */
Shape.prototype.cloneAs = function (constructor, attr/*, ...*/) {
  return new (constructor)(this.cloneAttr(_.isArray(attr) ? attr : _.tail(_.toArray(arguments))));
};

/**
 * Utility to merge an arg-list of attrs with this shape's attrs.
 * Will remove any attributes set to 'undefined' in the parameter.
 */
Shape.prototype.cloneAttr = function (attr/*, ...*/) {
  attr = _.isArray(attr) ? attr : _.toArray(arguments);
  var assigns = [_.clone(this.attr)].concat(attr); // _.assign can't take an array
  return _.omitBy(_.assign.apply(_, assigns), _.isUndefined);
};

/**
 * static shortcut for parsing the class attribute
 */
Shape.hasClass = function (attr, c) {
  return attr.class && _.includes(attr.class.split(' '), c);
};

/**
 * instance shortcut for parsing the class attribute
 */
Shape.prototype.hasClass = function (c) {
  return Shape.hasClass(this.attr, c);
};

/**
 * applies this shape to the given element.
 * By default, only merges attributes
 */
Shape.prototype.applyTo = function (e) {
  // Snap does not set classes when applying attributes
  if (this.attr.class) {
    e.node.className = this.attr.class;
  }
  return e.attr(this.attr);
};

/**
 * add this shape (and children or text) to the given Snap.svg paper
 */
Shape.prototype.addTo = function (paper) {
  var e = paper.el(this.name, this.attr);
  if (this.text) {
    e.node.textContent = this.text;
  } else if (this.children) {
    _.each(this.children, function (child) {
      child.addTo(paper).appendTo(e);
    });
  }
  return e;
};

/**
 * Utility for use in @see Shape.prototype.delta. Just returns the delta'd attributes
 * without creating a new Shape.
 * @see Shape.deltaAttr.
 */
Shape.prototype.deltaAttr = function (dAttr) {
  return Shape.deltaAttr(_.clone(this.attr), dAttr);
};

/**
 * Returns the mutated attributes according to the given deltas.
 * For numeric attributes, the given amounts are numeric deltas.
 * For the class attribute, a space-delimited list of classes. Suffix minus to remove (e.g. '-link').
 */
Shape.deltaAttr = function (attr, dAttr) {
  return _.assignWith(attr, dAttr, function (v, d, key) {
    if (NUMERIC_ATTR.test(key)) {
      return (v || 0) + d;
    } else if (key === 'class') {
      var changes = _.partition(d.split(' '), function (c) { return c.charAt(0) === '-' }),
          removals = _.map(changes[0], function (r) { return r.slice(1); }), additions = changes[1];
      return _.union(_.without.apply(_, (v ? [v.split(' ')] : []).concat(removals)), additions).join(' ');
    } else {
      return d;
    }
  });
};

/**
 * Utility to return any points from this shape that are outside of the given other shape,
 * plus intersection points.
 * Note that the return will not be ordered.
 */
Shape.prototype.pointsMinus = function (that) {
  return _.reject(this.points, _.bind(that.contains, that)).concat(this.intersect(that));
};

/**
 * Returns a function for moving the shape based on the given parameters
 * @param isEdge whether the cursor is on the edge of the shape
 * @param cursor Shape
 * @param getShapeById function (id) : Shape
 * @returns function (dx, dy, x, y) : Shape
 */
Shape.prototype.mover = null;

/**
 * Removes the part of the shape occluded by the given shape
 * @param that Shape
 * @returns an array of resulting shapes. Empty if this shape is completely occluded.
 */
Shape.prototype.minus = null;

/**
 * Returns strongly typed attributes for the given element
 */
Shape.strongAttr = function (e) {
  var attr = _.mapValues(_.pickBy(e.attr(), function (v, key) {
    return NUMERIC_ATTR.test(key) || STRING_ATTR.test(key);
  }), function (value, key) {
    return NUMERIC_ATTR.test(key) ? Number(value) : value;
  });
  for (var i = 0; i < e.node.style.length; i++) {
    var styleKey = e.node.style[i];
    if (NUMERIC_STYLE_ATTR.test(styleKey)) {
      attr[styleKey] = Number(/^([0-9]+)/.exec(e.node.style[styleKey])[1]);
    }
  }
  return attr;
};

function strongPoint(point) {
  // Correct all points to have numeric coordinates
  return new Point(Number(point.x), Number(point.y));
}

/**
 * b must have x, y, width & height. May also have other parameters
 */
function strongBBox(b) {
  var cx = b.cx || (b.c && b.c.x) || b.x + b.width/2,
      cy = b.cy || (b.c && b.c.y) || b.y + b.height/2;
  return {
    x : b.x,
    y : b.y,
    width : b.width,
    w : b.width,
    height : b.height,
    h : b.height,
    x2 : b.x2 || b.x + b.width,
    y2 : b.y2 || b.y + b.height,
    cx : cx,
    cy : cy,
    c : b.c || new Point(cx, cy),
    r1 : b.r1 || Math.min(b.width, b.height)/2,
    r2 : b.r2 || Math.max(b.width, b.height)/2,
    r0 : b.r0 || Math.sqrt(b.width*b.width + b.height*b.height)/2
  };
}

module.exports = Shape;
