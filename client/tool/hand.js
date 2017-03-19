var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Matrix = require('kld-affine').Matrix2D,
    Shape = require('../shape'),
    Tool = require('../tool'),
    Mutation = require('../action/mutation'),
    Snap = require('snapsvg');

var CURSOR_RADIUS = 16;

function Hand(picture) {
  Tool.call(this, picture);

  // Variable state
  function Moving(element) {
    if (!(this instanceof Moving)) return new Moving(element);
    this.element = element;
    this.originalShape = Shape.of(element);
    this.shape = this.originalShape;
  }

  Moving.prototype.setShape = function (shape) {
    this.shape = shape;
    picture.changed(this.shape.applyTo(this.element));
  };

  Moving.prototype.asMutation = function () {
    return new Mutation(this.originalShape, this.shape, { result : this.element });
  }

  var moving, move, others;

  function reset() {
    moving = move = others = null;
  }

  function getShapeById(id) {
    return Shape.of(picture.getElement(id));
  }

  function tryMove(element, isEdge, cursor) {
    if (element && element.node.nodeName !== 'svg') {
      moving = new Moving(element);
      move = moving.shape.mover && moving.shape.mover(isEdge, cursor, getShapeById);
      if (move) {
        // Capture other elements enclosed by the moving shape
        others = _.map(picture.elements(moving.shape.getBBox(), function (e) {
          return e !== element && moving.shape.contains(Shape.of(e));
        }), Moving);
      }
    }
    return move || reset();
  }

  // Move something
  function doMove(dx, dy, x, y) {
    // Establish the change as a transform matrix
    var oldBBox = moving.shape.getBBox(), newBBox, transform;
    moving.setShape(move.call(moving.shape, dx, dy, x, y));

    newBBox = moving.shape.getBBox();
    if (others.length && oldBBox.width && oldBBox.height) {
      transform = Matrix.IDENTITY
        .scaleNonUniformAt(oldBBox.width, oldBBox.height, newBBox.p).inverse()
        .scaleNonUniformAt(newBBox.width, newBBox.height, newBBox.p)
        .translate(newBBox.x - oldBBox.x, newBBox.y - oldBBox.y);
      _.each(others, function (other) {
        other.setShape(other.shape.transform(transform));
      });
    }
  }

  this.using = function using(delta, state) {
    if (delta.active) {
      if (state.active) { // Started to move something
        // Find something to grab - edges first
        var cursor = Tool.cursor(state, CURSOR_RADIUS);
        var edgeOf = _.last(picture.elements(cursor.getBBox(), function (e) {
          return cursor.intersect(Shape.of(e)).length;
        }));
        var bodyOf = picture.getElement(state.element);
        var point = new Point(state.x, state.y);
        if (!tryMove(edgeOf || bodyOf, edgeOf, cursor)) {
          // If edge didn't work, try the body, otherwise give up
          edgeOf && tryMove(bodyOf, false, cursor);
        }
      } else if (moving) { // Finished moving something
        this.emit('finished', moving.asMutation().and(_.map(others, _.method('asMutation'))));
        reset();
      }
    } else if (state.active) {
      if (moving) { // Moving an element
        doMove(delta.x || 0, delta.y || 0, state.x, state.y);
      } else { // Panning
        picture.viewBox(Shape.delta(picture.viewBox(), { x : -delta.x, y : -delta.y }));
      }
    }
  };
};

Hand.prototype = Object.create(Tool.prototype);
Hand.prototype.constructor = Hand;

Hand.prototype.activate = function () {
  this.paper.addClass('hand-mode');
};

Hand.prototype.deactivate = function () {
  this.paper.removeClass('hand-mode');
};

Hand.prototype.offset = new Point(CURSOR_RADIUS, CURSOR_RADIUS);

module.exports = Hand;
