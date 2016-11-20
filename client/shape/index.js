var _ = require('lodash'),
    as = require('yavl'),
    guid = require('../../lib/guid'),
    Point = require('kld-affine').Point2D,
    Matrix = require('kld-affine').Matrix2D,
    Vector = require('kld-affine').Vector2D,
    _cap = require('svg-intersections');

/**
 * A shape is an abstract immutable representation of an svg element.
 * Constructor takes an SVG node name, attributes, children and bbox.
 * Content can be an array of child shapes or a single string (no mixed nodes).
 * Content and bbox are optional.
 */
function Shape(name, attr, content, bbox) {
  if (this.constructor === Shape) {
    throw new Error("Can't instantiate abstract class!");
  }

  // Basic properties
  this.id = attr.id;
  this.name = name;
  this.attr = this.ATTR.cast(attr);
  this.text = _.isString(content) ? content : undefined;
  this.children = _.isArray(content) ? content : undefined;
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
    require('./linkarc'), // Before arc
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
 * yavl checker for acceptable attributes for a Shape. Shape sub-class prototypes
 * define sub-class attributes.
 */
Shape.prototype.ATTR = as({
  id : as(String).or(undefined),
  class : as(String).or(undefined)
});

/**
 * Returns JSONable data for this Shape
 */
Shape.prototype.toJSON = function () {
  var json = _.pick(this, 'name', 'attr', 'text');
  if (this.children) {
    json.children = _.map(this.children, _.method('toJSON'));
  }
  json.bbox = _.pick(this.bbox, 'x', 'y', 'width', 'height');
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
 * Gets a shape for the given Snap SVG or DOM element
 */
Shape.of = function (element) {
  return _.reduce(Shape.constructors(), function (shape, constructor) {
    return shape || constructor.fromElement(element);
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
 * Constructs a new shape with attributes changed by the given deltas, @see Shape.prototype.deltaAttr.
 */
Shape.prototype.delta = function (dAttr) {
  return this.clone(this.deltaAttr(dAttr));
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
  return _.assignWith(attr, dAttr, function (value, delta, key) {
    if (_.isFunction(delta)) {
      return delta(value);
    } else if ((_.isUndefined(value) || _.isNumber(value)) && _.isNumber(delta)) {
      return (value || 0) + delta;
    } else if (key === 'class') {
      var classes = (value ? [value.split(' ')] : []),
          changes = _.partition(delta.split(' '), function (c) { return c.charAt(0) === '-' }),
          removals = _.map(changes[0], function (r) { return r.slice(1); }), additions = changes[1];
      return _.union(_.without.apply(_, classes.concat(removals)), additions).join(' ');
    } else {
      return delta;
    }
  });
};

/**
 * Clones this shape with the given optional additional attributes
 */
Shape.prototype.clone = function (attr/*, ...*/) {
  return this.cloneAs.apply(this, [this.name].concat(_.toArray(arguments)));
};

/**
 * returns a new shape of the given type, optionally with new attributes as given.
 */
Shape.prototype.cloneAs = function (name, attr/*, ...*/) {
  return Shape.fromJSON({
    name : name,
    attr : this.cloneAttr.apply(this, _.slice(arguments, 1)),
    text : this.text,
    children : this.children,
    bbox : this.bbox
  });
};

/**
 * Utility to merge an arg-list of attrs with this shape's attrs.
 * Will remove any attributes set to 'undefined' in the parameter.
 */
Shape.prototype.cloneAttr = function (attr/*, ...*/) {
  var assigns = [_.clone(this.attr)].concat(_.toArray(arguments)); // _.assign can't take an array
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
 * Applies this shape to the given element (or element wrapper, e.g. from Snap.svg).
 * By default, only applies attributes (not text or children).
 */
Shape.prototype.applyTo = function (e) {
  _.each(this.attr, function (v, k) {
    (e.node || e).setAttribute(k, v);
  });
  return e;
};

/**
 * Add this shape (and children or text) to the given SVG paper (or paper wrapper, e.g. from Snap.svg)
 */
Shape.prototype.addTo = function (paper) {
  var e = paper.el ? paper.el(this.name, this.attr) : (function (shape) {
    var e = paper.ownerDocument.createElementNS('http://www.w3.org/2000/svg', shape.name);
    shape.applyTo(e);
    paper.appendChild(e);
    return e;
  })(this);

  if (this.text) {
    (e.node || e).textContent = this.text;
  } else if (this.children) {
    _.each(this.children, function (child) {
      var ce = child.addTo(paper);
      (e.node || e).appendChild(ce.node || ce);
    });
  }
  return e;
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
 * Returns the name of the given element (or element wrapper, e.g. from Snap.svg)
 */
Shape.elementName = function (e) {
  return (e.node || e).nodeName;
};

/**
 * Returns the attributes of the given element (or element wrapper, e.g. from Snap.svg).
 * If an attribute name is passed, returns the attribute value.
 */
Shape.elementAttr = function (e, name) {
  if (_.isString(name)) {
    return (e.node || e).getAttribute(name);
  } else if (e.attr) {
    return e.attr();
  } else {
    return _.reduce((e.node || e).attributes, function (attr, attribute) {
      return _.set(attr, attribute.name, attribute.textContent);
    }, {});
  }
};

/**
 * Returns the closest of an array of points to a given point
 */
Shape.closest = function (points, toPoint) {
  return _.minBy(points, _.bind(toPoint.distanceFrom, toPoint));
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
