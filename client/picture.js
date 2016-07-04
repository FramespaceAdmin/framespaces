var _ = require('lodash'),
    EventEmitter = require('events'),
    Shape = require('./shape'),
    Linkline = require('./shape/linkline'),
    Label = require('./shape/label'),
    guid = require('../lib/guid');

module.exports = function Picture(paper) {
  var events = new EventEmitter();

  function bareAddition(actionId, shape) {
    shape.attr.id || (shape.attr.id = guid()); // Slightly naughty
    function action() {
      return changed(shape.addTo(paper));
    };
    action.isOK = function () {
      return !getElement(shape.attr.id);
    };
    action.preview = previewer(shape);
    action.toJSON = function () {
      return { id : actionId, type : 'addition', shape : shape.toJSON() };
    };
    return action;
  }

  function addition(shape) {
    var actionId = guid();
    var action = bareAddition(actionId, shape);
    action.undo = bareRemoval(actionId, shape.attr.id);
    return chainable(action);
  }

  function bareRemoval(actionId, id) {
    function action() {
      return changed(getElement(id).remove());
    };
    action.isOK = function () {
      return getElement(id);
    };
    action.toJSON = function () {
      return { id : actionId, type : 'removal', element : id };
    };
    return action;
  }

  function removal(element) {
    var shape = Shape.of(element), id = shape.attr.id,
        collateral = _.map(linksTo(id).concat(linksFrom(id)), function (e1) {
          return mutation(e1, linkRemoved(e1));
        }).concat(_.map(labelsOn(id), function (e1) {
          return mutation(e1, labelRemoved(e1));
        })),
        actionId = guid(),
        action = bareRemoval(actionId, id);

    action.undo = bareAddition(actionId, shape);
    return chainable(action).and(collateral);
  }

  function bareReplacement(actionId, id, shape) {
    shape.attr.id || (shape.attr.id = id); // Slightly naughty
    function action() {
      getElement(id).remove();
      return changed(shape.addTo(paper));
    };
    action.isOK = function () {
      return getElement(id);
    };
    action.preview = previewer(shape);
    action.toJSON = function () {
      return { id : actionId, type : 'replacement', element : id, shape : shape.toJSON() };
    };
    return action;
  }

  function replacement(element, shape) {
    var id = element.attr('id'),
        oldShape = Shape.of(element),
        actionId = guid();
        action = bareReplacement(actionId, id, shape);

    action.undo = bareReplacement(actionId, id, oldShape);
    return chainable(action);
  }

  function bareMutation(actionId, id, shape) {
    function action() {
      var element = getElement(id);
      changed(shape.applyTo(element));
      return shape.hasClass('label') ? getElement(shape.attr.on) : element;
    };
    action.isOK = function () {
      return getElement(id) &&
        (!shape.hasClass('label') || getElement(shape.attr.on)) &&
        (!shape.hasClass('link') || (getElement(shape.attr.from) && getElement(shape.attr.to)));
    };
    if (shape.hasClass('link')) {
      var fromShape = Shape.of(getElement(shape.attr.from)),
          toShape = Shape.of(getElement(shape.attr.to)),
          linkShape = new Linkline(shape, fromShape, toShape);
      action.preview = previewer(fromShape, toShape, linkShape);
    } else if (shape.hasClass('label')) {
      var onShape = Shape.of(getElement(shape.attr.on)),
          labelShape = new Label(shape, onShape);
      action.preview = previewer(onShape, labelShape);
    } else {
      action.preview = previewer(shape);
    }
    action.toJSON = function () {
      return { id : actionId, type : 'mutation', element : id, shape : shape.toJSON() };
    };
    return action;
  }

  function mutation(element, shape, done) {
    var oldShape = done ? shape : Shape.of(element),
        newShape = done ? Shape.of(element) : shape,
        actionId = guid(),
        action = bareMutation(actionId, shape.attr.id, newShape);

    action.undo = bareMutation(actionId, shape.attr.id, oldShape);
    return chainable(action);
  }

  function bareChained(actions) {
    function chained() {
      // Return the result of the last action to succeed
      return _.reduce(actions, function (e, a) { return e && a(); }, true);
    }
    chained.isOK = function () {
      return _.first(actions).isOK(); // Can't tell if more is OK until action is run
    };
    chained.preview = _.first(actions).preview; // TODO
    chained.toJSON = function () {
      return _.flatten(_.map(actions, _.method('toJSON')));
    };
    return chained;
  }

  function chainable(action) {
    action.and = function (more) {
      if (_.isEmpty(more)) {
        return action;
      } else {
        var actions = [action].concat(more),
            chained = bareChained(actions);

        chained.undo = bareChained(_.reverse(_.map(actions, 'undo')));
        return chainable(chained);
      }
    }
    return action;
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

  function getElement(id) {
    return paper.select('#' + id);
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
        } else {
          linkRemoved(element).applyTo(element);
        }
      } else if (element.hasClass('label')) {
        var on = getElement(element.attr('on'));
        if (on) {
          new Label(Shape.of(element), Shape.of(on)).applyTo(element);
          on.after(element); // Ensure sensible Z-ordering for a label
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

  function changed(element) {
    events.emit('changed', element);
    return element;
  }

  events.on('changed', adjust);

  this.paper = paper;
  this.action = {
    fromJSON : function actionFromJSON(data) {
      if (_.isArray(data)) {
        return bareChained(_.map(data, actionFromJSON));
      } else {
        var shape = data.shape && Shape.fromJSON(data.shape);
        switch (data.type) {
          case 'addition': return bareAddition(data.id, shape);
          case 'removal': return bareRemoval(data.id, data.element);
          case 'replacement': return bareReplacement(data.id, data.element, shape);
          case 'mutation': return bareMutation(data.id, data.element, shape);
        }
      }
    }
  };
  this.action.addition = addition;
  this.action.removal = removal;
  this.action.replacement = replacement;
  this.action.mutation = mutation;
  this.changed = changed;
  this.getElement = getElement;
  this.on = _.bind(events.on, events);
};
