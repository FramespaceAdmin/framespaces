var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Tool = require('../tool'),
    Mutation = require('../action/mutation'),
    Snap = require('snapsvg');

var CURSOR_RADIUS = 16;

function Hand(picture) {
  Tool.call(this, picture);

  // Variable state
  var moving, oldShape, shape, move;

  function reset() {
    moving = oldShape = shape = move = null;
  }

  function tryMove(element, isEdge, cursor) {
    if (element && element.node.nodeName !== 'svg') {
      oldShape = shape = Shape.of(moving = element);
      var moverKey = _.find(['link', 'label'], _.bind(moving.hasClass, moving)) ||  shape.name;
      move = shape.mover && shape.mover(isEdge, cursor, function (id) {
        return Shape.of(picture.getElement(id));
      });
    }
    return move || reset();
  }

  this.using = function using(delta, state) {
    if (delta.active) {
      if (state.active) { // Started to move something
        // Find something to grab - edges first
        var cursor = Tool.cursor(state, CURSOR_RADIUS);
        var edgeOf = picture.getElement(function (e) {
          return cursor.intersect(Shape.of(e)).length;
        });
        var bodyOf = picture.getElement(state.element);
        var point = new Point(state.x, state.y);
        if (!tryMove(edgeOf || bodyOf, edgeOf, cursor)) {
          // If edge didn't work, try the body, otherwise give up
          edgeOf && tryMove(bodyOf, false, cursor);
        }
      } else if (moving) { // Finished moving something
        this.emit('finished', new Mutation(oldShape, shape, { result : moving }));
        reset();
      }
    } else if (state.active) {
      if (moving) { // Moving an element
        // Move something
        shape = move.call(shape, delta.x || 0, delta.y || 0, state.x, state.y);
        picture.changed(shape.applyTo(moving));
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
