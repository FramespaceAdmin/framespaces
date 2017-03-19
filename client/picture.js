var _ = require('lodash'),
    EventEmitter = require('events'),
    Shape = require('./shape'),
    Linkline = require('./shape/linkline'),
    Label = require('./shape/label'),
    rbush = require('rbush'),
    guid = require('../lib/guid'),
    as = require('yavl');

function Picture(paper) {
  this.paper = paper;
  this.rtree = rbush();
}

function rtreeSelector(bbox) {
  return {
    minX : bbox.x,
    minY : bbox.y,
    maxX : bbox.x2 || (bbox.x + bbox.width),
    maxY : bbox.y2 || (bbox.y + bbox.height)
  };
}

Picture.prototype = Object.create(EventEmitter.prototype);
Picture.prototype.constructor = Picture;

Picture.prototype.getElement = function (id) {
  return this.paper.select('#' + id);
};

Picture.prototype.getShape = function (e, changed) {
  return (!changed && e.shape) || (e.shape = Shape.of(e));
};

Picture.SELECTOR = as(String).and(as.size().gt(0)).or({
  x : Number, y : Number, width : Number, height : Number
});

Picture.prototype.elements = function (selector, filter) {
  Picture.SELECTOR.validate(selector);
  if (_.isString(selector)) {
    elements = this.paper.selectAll(selector + '[id]');
  } else {
    elements = _(this.rtree.search(rtreeSelector(selector)))
      .map('id').uniq().map(_.bind(this.getElement, this)).compact().value();
  }
  return _.filter(elements, function (e) {
    return _.get(e.node, 'style.display') !== 'none' && e.node.id && (!filter || filter(e));
  });
};

Picture.prototype.inLinks = function (id) {
  return _.uniq(_.concat(
    this.elements('.link[to="' + id + '"]'),
    this.elements('.link[from="' + id + '"]'),
    this.elements('.label[on="' + id + '"]')
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
      var fromShape = this.getShape(this.getElement(shape.attr.from)),
          toShape = this.getShape(this.getElement(shape.attr.to));
      return this.preview(paper, fromShape, toShape, shape.link(fromShape, toShape));
    } else if (shape.hasClass('label')) {
      var onShape = this.getShape(this.getElement(shape.attr.on));
      return this.preview(paper, onShape, shape.label(onShape));
    } else {
      return shape.addTo(paper);
    }
  } else {
    return paper.g.apply(paper, _.map(_.slice(arguments, 1), _.method('addTo', paper)));
  }
};

Picture.prototype.asUnlinkedShape = function (element) {
  return this.getShape(element).delta({ on : '', from : '', to : '', class : '-link -label' });
};

Picture.prototype.ensureOrder = function (elements) {
  var svg = this.paper.node;
  function indexOf(e) {
    return _.indexOf(svg.childNodes, e.node);
  }
  _.each(_.tail(elements), function (e, i) {
    if (indexOf(e) < indexOf(elements[i])) {
      elements[i].after(e);
    }
  });
};

Picture.prototype.sortByContains = function (elements) {
  return elements.sort(_.bind(function (e1, e2) {
    var s1 = this.getShape(e1), s2 = this.getShape(e2);
    return s1.contains(s2) ? -1 : s2.contains(s1) ? 1 : 0;
  }, this));
};

Picture.prototype.changed = function (element) {
  var id = element.attr('id');
  if (id) {
    this.rtree.remove({ id : id }, function (a, b) { return a.id === b.id; });
    if (!element.removed) {
      var shape = this.getShape(element, true);
      this.rtree.insert(_.set(rtreeSelector(shape.getBBox()), 'id', id));
      // Ensure enclosing shapes are ordered first
      this.ensureOrder(this.sortByContains(this.elements(shape.getBBox())));
      // Adjust any linked elements
      if (element.hasClass('link')) {
        var from = this.getElement(element.attr('from')), to = this.getElement(element.attr('to'));
        if (from && to) {
          shape.link(this.getShape(from), this.getShape(to)).applyTo(element);
          this.ensureOrder([from, to, element]); // Ensure sensible Z-ordering for a link
        } else {
          this.asUnlinkedShape(element).applyTo(element);
        }
      } else if (element.hasClass('label')) {
        var on = this.getElement(element.attr('on'));
        if (on) {
          shape.label(this.getShape(on)).applyTo(element);
          this.ensureOrder([on, element]); // Ensure sensible Z-ordering for a label
        } else {
          this.asUnlinkedShape(element).applyTo(element);
        }
      }
    }
    _.each(this.inLinks(id), _.bind(this.changed, this));
    this.emit('changed', element);
  }
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
