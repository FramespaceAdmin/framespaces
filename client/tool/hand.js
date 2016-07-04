var _ = require('lodash'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Rect = require('../shape/rect'),
    Snap = require('snapsvg'),
    EventEmitter = require('events');

var CURSOR_RADIUS = 16;

function Hand(picture) {
  // Constants
  var paper = picture.paper;
  var events = new EventEmitter();

  // Variable state
  var moving, oldShape, shape, move;

  function reset() {
    moving = oldShape = shape = move = null;
  }

  function tryMove(element, isEdge, point) {
    if (element && element.node.nodeName !== 'svg') {
      oldShape = shape = Shape.of(moving = element);
      var moverKey = _.find(['link', 'label'], _.bind(moving.hasClass, moving)) ||  shape.name;
      move = shape.mover && shape.mover(isEdge, { c : point, r : CURSOR_RADIUS }, function (id) {
        return Shape.of(picture.getElement(id));
      });
    }
    return move || reset();
  }

  function using(delta, state) {
    if (delta.active) {
      if (state.active) { // Started to move something
        // Find something to grab - edges first
        // NOTE svg-intersections can't intersect a circle and a circle, so use a rect
        var cursor = new Rect({
          x : state.x - CURSOR_RADIUS/2,
          y : state.y - CURSOR_RADIUS/2,
          width : CURSOR_RADIUS,
          height : CURSOR_RADIUS
        });
        var edgeOf = _.find(paper.selectAll('[id]'), function (e) {
          return cursor.intersect(Shape.of(e)).length;
        });
        var bodyOf = picture.getElement(state.element);
        var point = new Point(state.x, state.y);
        if (!tryMove(edgeOf || bodyOf, edgeOf, point)) {
          // If edge didn't work, try the body, otherwise give up
          edgeOf && tryMove(bodyOf, false, point);
        }
      } else if (moving) { // Finished moving something
        events.emit('finished', moving, oldShape);
        reset();
      }
    } else if (state.active && moving) { // Moving
      // Move something
      shape = move.call(shape, delta.x || 0, delta.y || 0, state.x, state.y);
      picture.changed(shape.applyTo(moving));
    }
  }

  this.activate = function () {
    paper.addClass('hand-mode');
  };
  this.deactivate = function () {
    paper.removeClass('hand-mode');
  };
  this.using = using;
  this.on = _.bind(events.on, events);
};

Hand.prototype.offset = new Point(CURSOR_RADIUS, CURSOR_RADIUS);
Hand.prototype.name = 'hand';

module.exports = Hand;
