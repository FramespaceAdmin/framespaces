var _ = require('lodash'),
    EventEmitter = require('events'),
    Shape = require('./shape'),
    Linkline = require('./shape/linkline'),
    Label = require('./shape/label'),
    guid = require('../lib/guid');

function Picture(paper) {
  this.paper = paper;
  this.on('changed', _.bind(this.adjust, this));
}

Picture.prototype = Object.create(EventEmitter.prototype);
Picture.prototype.constructor = Picture;

Picture.prototype.allElements = function () {
  return _.filter(this.paper.selectAll('[id]'), function (e) {
    return _.get(e, 'node.style.display') !== 'none';
  });
};

Picture.prototype.getElement = function (filter) {
  if (_.isFunction(filter)) {
    return _.findLast(this.allElements(), filter);
  } else {
    return this.paper.select('#' + filter);
  }
};

Picture.prototype.getElements = function (selector) {
  return _.toArray(this.paper.selectAll(selector))
};

Picture.prototype.inLinks = function (id) {
  return _.uniq(_.concat(
    this.getElements('.link[to="' + id + '"]'),
    this.getElements('.link[from="' + id + '"]'),
    this.getElements('.label[on="' + id + '"]')
  ));
};

Picture.prototype.outLinks = function (element) {
  return _.map(_.filter([
    element.attr('to'), element.attr('from'), element.attr('on')
  ]), _.bind(this.getElement, this));
};

Picture.prototype.preview = function (paper, shape/*...*/) {
  if (arguments.length === 2) {
    // For links and labels, include the lined and labelled elements
    if (shape.hasClass('link')) {
      var fromShape = Shape.of(this.getElement(shape.attr.from)),
          toShape = Shape.of(this.getElement(shape.attr.to));
      return this.preview(paper, fromShape, toShape, shape.link(fromShape, toShape));
    } else if (shape.hasClass('label')) {
      var onShape = Shape.of(this.getElement(shape.attr.on));
      return this.preview(paper, onShape, shape.label(onShape));
    } else {
      return shape.addTo(paper);
    }
  } else {
    return paper.g.apply(paper, _.map(_.slice(arguments, 1), _.method('addTo', paper)));
  }
};

Picture.prototype.asUnlinkedShape = function (element) {
  return Shape.of(element).delta({ on : '', from : '', to : '', class : '-link -label' });
};

Picture.prototype.adjust = function (element) {
  if (!element.removed) {
    if (element.hasClass('link')) {
      var from = this.getElement(element.attr('from')), to = this.getElement(element.attr('to'));
      if (from && to) {
        Shape.of(element).link(Shape.of(from), Shape.of(to)).applyTo(element);
        this.ensureOrder(from, to, element); // Ensure sensible Z-ordering for a link
      } else {
        this.asUnlinkedShape(element).applyTo(element);
      }
    } else if (element.hasClass('label')) {
      var on = this.getElement(element.attr('on'));
      if (on) {
        Shape.of(element).label(Shape.of(on)).applyTo(element);
        this.ensureOrder(on, element); // Ensure sensible Z-ordering for a label
      } else {
        this.asUnlinkedShape(element).applyTo(element);
      }
    }
  }
  _.each(this.inLinks(element.attr('id')), _.bind(this.adjust, this));
  return element;
};

Picture.prototype.ensureOrder = function (e1, e2/*, ...*/) {
  var svg = this.paper.node;
  function indexOf(e) {
    return _.indexOf(svg.childNodes, e.node);
  }
  var elements = _.toArray(arguments);
  _.each(_.tail(elements), function (e, i) {
    if (indexOf(e) < indexOf(elements[i])) {
      elements[i].after(e);
    }
  });
};

Picture.prototype.changed = function (element) {
  this.emit('changed', element);
  return element;
};

Picture.prototype.viewBox = function (newBox) {
  if (newBox) {
    this.paper.attr('viewBox', [newBox.x, newBox.y, newBox.width, newBox.height].join(' '));
    this.emit('viewChanged', newBox);
    return newBox;
  } else {
    // Establish the current view box (client rect at 0,0 if not available)
    var vb = this.paper.attr('viewBox') || this.paper.node.getBoundingClientRect();
    return _.defaults(_.pick(vb, 'x', 'y', 'width', 'height'), { x : 0, y : 0 });
  }
};

Picture.prototype.zoom = function (amount, clientCentre) {
  var client = this.paper.node.getBoundingClientRect(), vb = this.viewBox(),
      width = Math.max(100, vb.width + amount), // Arbirarily choose to scale the width
      height = vb.width * (client.height / client.width), // Scale height in proportion
      dx = width - vb.width, dy = height - vb.height, // Establish actual changes
      // Adjust the origin so that the centre stays still
      x = vb.x - (dx * ((clientCentre.x - client.left) / client.width)),
      y = vb.y - (dy * ((clientCentre.y - client.top) / client.height));

  this.viewBox({ x : x, y : y, width : width, height : height });
};

module.exports = Picture;
