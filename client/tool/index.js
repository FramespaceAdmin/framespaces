var _ = require('lodash'),
    Shape = require('../shape'),
    Rect = require('../shape/rect'),
    EventEmitter = require('events');

function Tool(picture) {
  EventEmitter.call(this);

  this.picture = picture;
  this.paper = picture.paper;
}

Tool.prototype = Object.create(EventEmitter.prototype);
Tool.prototype.constructor = Tool;

Tool.prototype.using = function using(delta, state) {
  throw new Error('Function using(delta, state) must be overridden');
};

Tool.prototype.offset = null;

Tool.cursor = function (state, radius) {
  // NOTE svg-intersections can't intersect a circle and a circle, so use a rect
  return new Rect({
    x : state.x - radius/2,
    y : state.y - radius/2,
    width : radius,
    height : radius
  });
};

module.exports = Tool;
