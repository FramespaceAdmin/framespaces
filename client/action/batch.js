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
  return _.reduce(this.batch, _.bind(function (batchResults, action, i) {
    if (batchResults) { // Propagate failure forward
      // Batching can introduce inconsistency, so check okayness
      var results = action.isOK(subject) && action.do(subject);
      if (results) {
        return batchResults.concat(results);
      } else while (i) { // Back out those that succeeded, before returning nothing
        this.batch[--i].un().do(subject);
      }
    }
  }, this), []);
};

Batch.prototype.isOK = function (subject) {
  // Can't tell if more is OK until action is run
  return this.batch.length ? _.first(this.batch).isOK(subject) : true;
};

Batch.prototype.un = function () {
  var undoActions = _.reverse(_.map(this.batch, _.method('un')));
  return new Batch(undoActions, { undoOf : this.id });
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
  while (actions[0] && this.batch[0] && this.batch[0].id === actions[0].id) {
    actions.shift();
    this.batch.shift();
  }
  return !actions.length;
};

module.exports = Batch;
