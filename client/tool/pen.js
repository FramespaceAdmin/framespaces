var _ = require('lodash'),
    guid = require('../../lib/guid'),
    Point = require('kld-affine').Point2D,
    Shape = require('../shape'),
    Addition = require('../action/addition'),
    Tool = require('../tool');

function Pen(picture) {
  Tool.call(this, picture);
  var paper = picture.paper;

  var element, activity;

  function processLFs(text) {
    _.reduce(Shape.elementSelectAll(text, 'tspan'), function (prev, tspan) {
      if (prev.node.textContent.length) {
        var a = prev.node.getStartPositionOfChar(0).x,
            b = prev.node.getEndPositionOfChar(prev.node.textContent.length - 1).x;
        return tspan.attr({ dx : a - b, dy : 32 });
      } else {
        return tspan.attr({ dx : prev.attr('dx'), dy : 32 + Number(prev.attr('dy') || 0) });
      }
    });
    return text;
  }

  function toLines(chars) {
    return _.reduce(chars, function (text, char) {
      if (char.length > 1) {
        switch (char) {
          case 'backspace':
            return text.substring(0, text.length - 1);
          case 'enter':
            return text + '\n';
          default: // Not a supported control char
            return text;
        }
      } else {
        return text + char;
      }
    }, '').split('\n');
  }

  this.using = function using(delta, state) {
    function text() {
      return paper.text(toLines(_.map(activity, 'char'))).move(state.x, state.y)
        .attr('font-size', _.get(paper.attr(), 'font-size')).attr('id', '');
    }
    function dot() {
      return paper.circle(0).move(state.x, state.y).addClass('dot').attr('id', '');
    }
    function polyline() {
      return paper.polyline(_(activity).map(function (state) {
        return [state.x, state.y];
      }).uniqBy(_.toString).flatten().value()).attr('id', '');
    }

    if (delta.active) {
      if (state.active) { // Started something new
        activity = [state];
        element = state.char ? text() : dot();
        processLFs(element);
      } else { // Finished an element
        activity = undefined;
        element.remove();
        this.emit('finished', new Addition(Shape.of(element)));
      }
    } else if (state.active) { // Drawing or typing
      element.remove();
      activity.push(state);
      element = state.char ? text() : polyline();
      processLFs(element);
    }
  };
};

Pen.prototype = Object.create(Tool.prototype);
Pen.prototype.constructor = Pen;

Pen.prototype.offset = new Point(0, 32);

module.exports = Pen;
