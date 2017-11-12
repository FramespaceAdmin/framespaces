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
  json.bbox = _.pick(this.getBBox(), 'x', 'y', 'width', 'height');
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
 * Utility that checks the element is not falsey and has not been removed from the DOM
 */
Shape.ofAttached = function (element) {
  return element && !Shape.elementRemoved(element) && Shape.of(element);
};

/**
 * Lazily computed property
 */
Shape.prototype.getParams = function () {
  return this.params || (this.params = this.computeParams());
};

/**
 * Lazily computed property
 */
Shape.prototype.getPoints = function () {
  return this.points || (this.points = _.map(this.computePoints(), strongPoint));
};

/**
 * Lazily computed property
 */
Shape.prototype.getEnds = function () {
  return this.ends || (this.ends = this.computeEnds ? this.computeEnds() : []);
};

/**
 * Lazily computed property
 */
Shape.prototype.getBBox = function () {
  return this.bbox || (this.bbox = strongBBox(this.computeBBox()));
};

/**
 * Lazily computed property
 */
Shape.prototype.getExtent = function () {
  return this.extent || (this.extent = this.computeExtent());
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
  return this.getParams().params[0];
};

/**
 * Default bbox computation. Override to specialise.
 * Return must have x, y, width & height. May also have other parameters.
 * Called after points have been computed.
 */
Shape.prototype.computeBBox = function () {
  return Shape.computeBBox(this.getPoints());
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
  return new Point(0, 0).distanceFrom(new Point(this.getBBox().w, this.getBBox().h)); // diagonal
};

/**
 * Default matrix computation. Override to specialise.
 * @param matrix [optional] a matrix to transform (defaults to the identity matrix)
 * @returns a matrix transformed with the shape's position, size and orientation
 */
Shape.prototype.matrix = function (matrix) {
  return this.translation(this.rotation(this.scale(matrix)));
};

/**
 * Default rotation matrix computation. Override to specialise.
 * @param matrix [optional] a matrix to transform (defaults to the identity matrix)
 * @returns a matrix transformed with the shape's orientation
 */
Shape.prototype.rotation = function (matrix) {
  return matrix || Matrix.IDENTITY;
};

/**
 * Default translation matrix computation. Override to specialise.
 * @param matrix [optional] a matrix to transform (defaults to the identity matrix)
 * @returns a matrix transformed with the shape's position
 */
Shape.prototype.translation = function (matrix) {
  return (matrix || Matrix.IDENTITY).translate(this.getBBox().x, this.getBBox().y);
};

/**
 * Default scale matrix computation. Override to specialise.
 * @param matrix [optional] a matrix to transform (defaults to the identity matrix)
 * @returns a matrix transformed with the shape's size
 */
Shape.prototype.scale = function (matrix) {
  return (matrix || Matrix.IDENTITY).scaleNonUniform(this.getBBox().w, this.getBBox().h);
};

/**
 * Trivial utility to construct a matrix from anything with a, b, c, d, e & f properties.
 */
Shape.matrix = function (m) {
  return new Matrix(m.a, m.b, m.c, m.d, m.e, m.f);
};

/**
 * Transform this shape according to the given matrix, as best possible while keeping the
 * shape's class. For example, a circle should not become an ellipse.
 * @param matrix the transformation matrix
 * @returns a new shape, of the same class, transformed according to the matrix
 */
Shape.prototype.transform = function (matrix) {
  throw undefined;
};

/**
 * returns an array of intersection Points with the given shape
 */
Shape.prototype.intersect = function (that) {
  return _cap.intersect(this.getParams(), that.getParams()).points || [];
};

/**
 * returns truthy if the shape contains the given point or shape.
 * The default behaviour uses the Jordan curve theorem per
 * https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 */
Shape.prototype.contains = function (that) {
  if (that instanceof Shape) {
    return _.every(that.getPoints(), _.bind(this.contains, this)) && !this.intersect(that).length;
  } else {
    // Check bbox bounds first
    var bbox = this.getBBox();
    if (that.x < bbox.x || that.y < bbox.y || that.x > bbox.x2 || that.y > bbox.y2) {
      return false;
    } else {
      var ray = _cap.shape('line', { x1 : bbox.x, y1 : bbox.y, x2 : that.x, y2 : that.y }),
          intersects = _cap.intersect(this.getParams(), ray).points;
      return !intersects || intersects.length % 2;
    }
  }
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
 * @see Shape.delta.
 */
Shape.prototype.deltaAttr = function (dAttr) {
  return Shape.delta(_.clone(this.attr), dAttr);
};

/**
 * Returns the mutated attributes according to the given deltas.
 * For numeric attributes, the given amounts are numeric deltas.
 * For the class attribute, a space-delimited list of classes. Suffix minus to remove (e.g. '-link').
 * Deltas can also be functions, which take an existing value and return the changed value.
 * NOTE as a utility, this function copes with deep attribute paths,
 * even though that's meaningless for attributes.
 * This function mutates attr
 */
Shape.delta = function (attr, dAttr) {
  return _.reduce(dAttr, function (attr, delta, path) {
    var updater;
    if (_.isFunction(delta)) {
      updater = delta;
    } else if (_.isNumber(delta)) {
      updater = function (value) {
        return (value || 0) + (delta || 0); // Cater for NaN
      }
    } else if (path === 'class') {
      updater = function (value) {
        var classes = (value ? [value.split(' ')] : []),
            changes = _.partition(delta.split(' '), function (c) { return c.charAt(0) === '-' }),
            removals = _.map(changes[0], function (r) { return r.slice(1); }), additions = changes[1];
        return _.union(_.without.apply(_, classes.concat(removals)), additions).join(' ');
      }
    } else {
      updater = _.constant(delta);
    }
    return _.update(attr, path, updater);
  }, attr);
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
    bbox : this.getBBox()
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
  return Shape.applyAttr(e, this.attr);
};

/**
 * Utility to set attributes on the given element or element wrapper
 */
Shape.applyAttr = function (e, attr) {
  _.each(attr, function (v, k) {
    (e.node || e).setAttribute(k, v);
  });
  return e;
};

/**
 * Add this shape (and children or text) to the given SVG paper (or paper wrapper, e.g. from Snap.svg)
 */
Shape.prototype.addTo = function (paper) {
  var e = (function () {
    if (paper.el) {
      return paper.el(this.name, this.attr); // Snap-like
    } else if (paper.element) {
      return paper.element(this.name).attr(this.attr).attr('id', this.id || ''); // svg.js-like
    } else if (_.isElement(paper)) {
      var e = paper.ownerDocument.createElementNS('http://www.w3.org/2000/svg', this.name);
      this.applyTo(e);
      paper.appendChild(e);
      return e;
    } else {
      throw new Error('Don\'t know how to draw on ' + paper);
    }
  }).call(this);

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
  return _.reject(this.getPoints(), _.bind(that.contains, that)).concat(this.intersect(that));
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
 * Returns the attributes of the given element or element wrapper, e.g. from Snap.svg.
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
 * Returns the given named style attribute of the element or element wrapper, e.g. from Snap.svg.
 */
Shape.elementStyle = function (e, name) {
  return Shape.elementAttr(e, name) || (e.node || e).style[name];
};

/**
 * Gets a bbox for the given element or element wrapper, e.g. from Snap.svg,
 * as best is available natively. Note that Shapes are usually capable of generating
 * a bbox for themselves.
 */
Shape.elementBBox = function (e) {
  return (e.bbox || e.getBBox).call(e);
};

/**
 * Selects child elements for the given element or element wrapper, e.g. from Snap.svg
 */
Shape.elementSelectAll = function (e, selector) {
  if (e.selectAll) {
    return e.selectAll(selector); // Snap.svg style
  } else if (e.select) {
    return _.get(e.select(selector), 'members', []); // SVG.js parent style
  } else if (_.isElement(e.node || e)) {
    return (e.node || e).querySelectorAll(selector);
  }
};

/**
 * Returns text content for the given element or element wrapper, e.g. from Snap.svg
 */
Shape.elementText = function (e) {
  return (e.node || e).textContent;
};

/**
 * Determines if the given element has been removed from the DOM
 */
Shape.elementRemoved = function (e) {
  return _.isFunction(e.parent) ? !e.parent() : e.removed || !e.parentNode;
};

/**
 * Returns the closest of an array of points to a given point
 */
Shape.closest = function (points, toPoint) {
  return _.minBy(points, _.bind(toPoint.distanceFrom, toPoint));
};

Shape.BBOX = as({ x : Number, y : Number, width : Number, height : Number });

/**
 * Obtains the bounding box of all its arguments
 * @param args... any combination of bbox-like objects or objects with a getBBox() member
 * @return the bounding box of all the arguments, or null
 */
Shape.bbox = function (/*bboxes or shapes*/) {
  return _.reduce(arguments, function (bbox, arg) {
    var argBBox = Shape.BBOX.matches(arg) ? arg : _.get(arg, 'getBBox') ? arg.getBBox() : null;
    return !bbox ? argBBox : !argBBox ? bbox : (function (x, y) {
      return {
        x : x, y : y,
        width : Math.max(x2(bbox), x2(argBBox)) - x,
        height : Math.max(y2(bbox), y2(argBBox)) - y
      }
    })(Math.min(bbox.x, argBBox.x), Math.min(bbox.y, argBBox.y));
  }, null);
};

function strongPoint(point) {
  // Correct all points to have numeric coordinates
  return new Point(Number(point.x), Number(point.y));
}

function x2(bbox) {
  return bbox.x2 || bbox.x + bbox.width;
}

function y2(bbox) {
  return bbox.y2 || bbox.y + bbox.height;
}

/**
 * b must have x, y, width & height. May also have other parameters
 */
function strongBBox(b) {
  Shape.BBOX.validate(b);
  var cx = b.cx || (b.c && b.c.x) || b.x + b.width/2,
      cy = b.cy || (b.c && b.c.y) || b.y + b.height/2;
  return {
    x : b.x,
    y : b.y,
    p : b.p || new Point(b.x, b.y),
    width : b.width,
    w : b.width,
    height : b.height,
    h : b.height,
    x2 : x2(b),
    y2 : y2(b),
    cx : cx,
    cy : cy,
    c : b.c || new Point(cx, cy)
  };
}

module.exports = Shape;
