var _ = require('lodash'),
    guid = require('../../lib/guid'),
    Action = require('../action');

function Batch(actions, options) {
  if (actions.length === 1) {
    return actions[0];
  } else {
    Action.call(this, options);
    this.actions = _.flatten(actions);
  }
}

Batch.fromJSON = function (data) {
  return _.isArray(data) && new Batch(_.map(data, Action.fromJSON));
};

Batch.prototype = Object.create(Action.prototype);
Batch.prototype.constructor = Batch;

Batch.prototype.do = function (subject) {
  // Return the result of the last action to succeed
  return _.reduce(this.actions, function (result, action) {
    // We only apply OK actions, because inconsistency is possible by batching
    if (result && action.isOK(subject)) {
      result = action.do(subject);
    }
    return result;
  }, true);
};

Batch.prototype.isOK = function (subject) {
  return _.first(this.actions).isOK(subject); // Can't tell if more is OK until action is run
};

Batch.prototype.un = function () {
  var undoActions = _.reverse(_.map(this.actions, _.method('un')));
  return new Batch(undoActions, this.undoOptions());
};

Batch.prototype.preview = function () {
  var previewable = _.find(this.actions, 'preview');
  if (previewable) {
    return previewable.preview.apply(previewable, arguments); // TODO
  }
};

Batch.prototype.toJSON = function () {
  return _.map(this.actions, _.method('toJSON'));
};

module.exports = Batch;
