var _ = require('lodash'),
    guid = require('../lib/guid');

// TODO: Recfator this to proper classes

/* class Action extends function() {
  id : String,
  description : String, // Some kind of useful string for logging
  isUser : boolean, // Whether the user took the action (truthy), or the system
  isOK : function() : boolean // Can this action be applied
  undo : Action,
  prev : undefined Action, // Set by history
  next : undefined Action, // Set by history
  preview : optional function(paper), // Paper is a temporary svg
  toJSON : function() // returns JSONable data,
  result : undefined value // the returned value, set by history,
  confidence : Number < 1 // for futures
};*/

exports.batch = function (actions) {
  function batch() {
    // Return the result of the last action to succeed
    return _.reduce(actions, function (result, action) {
      // We only apply OK actions, because inconsistency is possible by batching
      if (result && (!action.isOK || action.isOK())) {
        result = action();
      }
      return result;
    }, true);
  }
  batch.isOK = function () {
    return _.first(actions).isOK(); // Can't tell if more is OK until action is run
  };
  batch.preview = _.first(actions).preview; // TODO
  batch.toJSON = function () {
    return _.flatten(_.map(actions, _.method('toJSON')));
  };
  // Undo is lazy to prevent recursion
  batch.withUndo = function () {
    batch.undo = exports.batch(_.reverse(_.map(actions, 'undo')));
    return batch;
  };
  return batch;
};

exports.identified = function (action, id) {
  return _.set(action, 'id', id || guid());
};

exports.undoable = function (action, undo) {
  return _.set(action, 'undo', _.set(undo, 'id', action.id));
};

exports.chainable = function (action) {
  return _.set(action, 'and', function (more) {
    if (_.isEmpty(more)) {
      return action;
    } else {
      return exports.chainable(exports.batch([action].concat(more)).withUndo());
    }
  });
};
