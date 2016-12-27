var _ = require('lodash'),
    guid = require('../../lib/guid'),
    Action = require('../action');

function Batch(actions, options) {
  Action.call(this, options);
  this.batch = _.flatten(_.map(_.flatten(actions), _.method('actions')));
}

Batch.fromJSON = function (data) {
  return _.isArray(data) && new Batch(_.map(data, Action.fromJSON));
};

Batch.prototype = Object.create(Action.prototype);
Batch.prototype.constructor = Batch;

Batch.prototype.do = function (subject) {
  // Return the result of the last action to succeed
  return _.reduce(this.batch, function (result, action) {
    // We only apply OK actions, because inconsistency is possible by batching
    if (result && action.isOK(subject)) {
      result = action.do(subject);
    }
    return result;
  }, true);
};

Batch.prototype.isOK = function (subject) {
  // Can't tell if more is OK until action is run
  return this.batch.length ? _.first(this.batch).isOK(subject) : true;
};

Batch.prototype.un = function () {
  var undoActions = _.reverse(_.map(this.batch, _.method('un')));
  return new Batch(undoActions, this.undoOptions());
};

Batch.prototype.preview = function () {
  var previewable = _.find(this.batch, 'preview');
  if (previewable) {
    return previewable.preview.apply(previewable, arguments); // TODO
  }
};

Batch.prototype.toJSON = function () {
  return _.map(this.batch, _.method('toJSON'));
};

Batch.prototype.actions = function () {
  return _.clone(this.batch);
};

/**
 * Removes the given action from the start of this Batch.
 * @param action the action to remove
 * @returns true if the given action was at the head of this Batch
 */
Batch.prototype.removeHead = function (action) {
  var actions = action.actions();
  this.batch = _.takeWhile(this.batch, function (a) {
    return actions[0] && a.id === actions[0].id && actions.shift();
  });
  return !actions.length;
};

module.exports = Batch;
