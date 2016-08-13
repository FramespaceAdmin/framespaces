var _ = require('lodash'),
    _action = require('./action'),
    EventEmitter = require('events'),
    Shape = require('./shape'),
    Linkline = require('./shape/linkline'),
    Label = require('./shape/label'),
    guid = require('../lib/guid');

module.exports = function Picture(paper) {
  var events = new EventEmitter();

  function bareAddition(shape) {
    shape.attr.id || (shape.attr.id = guid()); // Slightly naughty
    function addition() {
      return changed(shape.addTo(paper));
    };
    addition.isOK = function () {
      return !getElement(shape.attr.id);
    };
    addition.preview = previewer(shape);
    addition.toJSON = function () {
      return { id : addition.id, type : 'addition', shape : shape.toJSON() };
    };
    return addition;
  }

  function addition(shape) {
    return publicAction(bareAddition(shape), bareRemoval(shape.attr.id));
  }

  function bareRemoval(id) {
    function removal() {
      return changed(getElement(id).remove());
    };
    removal.isOK = function () {
      return getElement(id);
    };
    removal.toJSON = function () {
      return { id : removal.id, type : 'removal', element : id };
    };
    return removal;
  }

  function removal(element) {
    var shape = Shape.of(element), id = shape.attr.id,
        collateral = _.map(linksTo(id).concat(linksFrom(id)), function (e1) {
          return mutation(e1, linkRemoved(e1));
        }).concat(_.map(labelsOn(id), function (e1) {
          return mutation(e1, labelRemoved(e1));
        }));

    return publicAction(bareRemoval(id), bareAddition(shape)).and(collateral);
  }

  function bareReplacement(id, shape) {
    shape.attr.id || (shape.attr.id = id); // Slightly naughty
    function replacement() {
      getElement(id).remove();
      return changed(shape.addTo(paper));
    };
    replacement.isOK = function () {
      return getElement(id);
    };
    replacement.preview = previewer(shape);
    replacement.toJSON = function () {
      return { id : replacement.id, type : 'replacement', element : id, shape : shape.toJSON() };
    };
    return replacement;
  }

  function replacement(element, shape) {
    var id = element.attr('id'),
        oldShape = Shape.of(element);

    return publicAction(bareReplacement(id, shape), bareReplacement(id, oldShape));
  }

  function bareMutation(id, shape) {
    function mutation() {
      var element = getElement(id);
      changed(shape.applyTo(element));
      return shape.hasClass('label') ? getElement(shape.attr.on) : element;
    };
    mutation.isOK = function () {
      return getElement(id) &&
        (!shape.hasClass('label') || getElement(shape.attr.on)) &&
        (!shape.hasClass('link') || (getElement(shape.attr.from) && getElement(shape.attr.to)));
    };
    if (shape.hasClass('link')) {
      var fromShape = Shape.of(getElement(shape.attr.from)),
          toShape = Shape.of(getElement(shape.attr.to)),
          linkShape = new Linkline(shape, fromShape, toShape);
      mutation.preview = previewer(fromShape, toShape, linkShape);
    } else if (shape.hasClass('label')) {
      var onShape = Shape.of(getElement(shape.attr.on)),
          labelShape = new Label(shape, onShape);
      mutation.preview = previewer(onShape, labelShape);
    } else {
      mutation.preview = previewer(shape);
    }
    mutation.toJSON = function () {
      return { id : mutation.id, type : 'mutation', element : id, shape : shape.toJSON() };
    };
    return mutation;
  }

  function mutation(element, shape, done) {
    var oldShape = done ? shape : Shape.of(element),
        newShape = done ? Shape.of(element) : shape;

    return publicAction(bareMutation(shape.attr.id, newShape),
                        bareMutation(shape.attr.id, oldShape));
  }

  function publicAction(action, undo) {
    return _action.chainable(_action.undoable(_action.identified(action), undo));
  }

  function previewer(shape) {
    if (arguments.length === 1) {
      return _.bind(Shape.prototype.addTo, shape);
    } else {
      var shapes = _.toArray(arguments);
      return function (paper) {
        return paper.g.apply(paper, _.map(shapes, _.method('addTo', paper)));
      }
    }
  }

  function allElements() {
    return _.filter(paper.selectAll('[id]'), function (e) {
      return _.get(e, 'node.style.display') !== 'none';
    });
  }

  function getElement(filter) {
    if (_.isFunction(filter)) {
      return _.findLast(allElements(), filter);
    } else {
      return paper.select('#' + filter);
    }
  }

  function linksTo(id) {
    return _.toArray(paper.selectAll('.link[to="' + id + '"]'));
  }

  function linksFrom(id) {
    return _.toArray(paper.selectAll('.link[from="' + id + '"]'));
  }

  function labelsOn(id) {
    return _.toArray(paper.selectAll('.label[on="' + id + '"]'));
  }

  function linkRemoved(element) {
    return Shape.of(element).delta({ from : '', to : '', class : '-link' });
  }

  function labelRemoved(element) {
    return Shape.of(element).delta({ on : '', class : '-label' });
  }

  function adjust(element) {
    if (!element.removed) {
      if (element.hasClass('link')) {
        var from = getElement(element.attr('from')), to = getElement(element.attr('to'));
        if (from && to) {
          new Linkline(Shape.of(element), Shape.of(from), Shape.of(to)).applyTo(element);
          ensureOrder(from, to, element); // Ensure sensible Z-ordering for a link
        } else {
          linkRemoved(element).applyTo(element);
        }
      } else if (element.hasClass('label')) {
        var on = getElement(element.attr('on'));
        if (on) {
          new Label(Shape.of(element), Shape.of(on)).applyTo(element);
          ensureOrder(on, element); // Ensure sensible Z-ordering for a label
        } else {
          labelRemoved(element).applyTo(element);
        }
      }
    }
    _.each(linksTo(element.attr('id')), adjust);
    _.each(linksFrom(element.attr('id')), adjust);
    _.each(labelsOn(element.attr('id')), adjust);
    return element;
  }

  function ensureOrder(e1, e2/*, ...*/) {
    function indexOf(e) {
      return _.indexOf(paper.node.childNodes, e.node);
    }
    var elements = _.toArray(arguments);
    _.each(_.tail(elements), function (e, i) {
      if (indexOf(e) < indexOf(elements[i])) {
        elements[i].after(e);
      }
    });
  }

  function changed(element) {
    events.emit('changed', element);
    return element;
  }

  events.on('changed', adjust);

  this.paper = paper;
  this.action = {
    fromJSON : function actionFromJSON(data) {
      if (_.isArray(data)) {
        return _action.batch(_.map(data, actionFromJSON));
      } else {
        var shape = data.shape && Shape.fromJSON(data.shape);
        var action = (function () {
          switch (data.type) {
            case 'addition': return bareAddition(shape);
            case 'removal': return bareRemoval(data.element);
            case 'replacement': return bareReplacement(data.element, shape);
            case 'mutation': return bareMutation(data.element, shape);
          }
        })();
        action.id = data.id;
        return action;
      }
    }
  };
  this.action.addition = addition;
  this.action.removal = removal;
  this.action.replacement = replacement;
  this.action.mutation = mutation;
  this.changed = changed;
  this.getElement = getElement;
  this.allElements = allElements;
  this.on = _.bind(events.on, events);
};
