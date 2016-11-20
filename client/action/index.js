var _ = require('lodash'),
    guid = require('../../lib/guid'),
    as = require('yavl');

function Action(options) {
  _.assign(this, _.defaults(options, {
    id : guid(),
    description : '',
    isUser : false
  }));
}

Action.OPTIONS = as(_.mapValues({
  id : String, // Will be set to a new GUID if not defined
  description : String, // Some kind of useful string for logging
  isUser : Boolean, // Whether the user took the action (truthy), or the system
  prev : Action, // Set by history
  next : Action, // Set by history
  result : Object, // the returned value, set by history
  confidence : as(Number).lt(1) // for futures
}, _.method('or', undefined))); // Options are optional

/**
 * All the Actions in the world.
 */
Action.constructors = _.once(function () {
  return [
    require('./batch'),
    require('./addition'),
    require('./removal'),
    require('./mutation'),
    require('./replacement')
  ];
});

/**
 * Creates a suitable Action from the given JSON object.
 * @param data the JSON data
 */
Action.fromJSON = function (data) {
  return _.reduce(Action.constructors(), function (action, constructor) {
    return action || constructor.fromJSON(data);
  }, null);
};

/**
 * Enacts this Action
 * @returns [Object] Some kind of result
 */
Action.prototype.do = function (subject) {
  throw undefined;
};

/**
 * @returns [boolean] Can this action be applied
 */
Action.prototype.isOK = function (subject) {
  return true;
};

/**
 * @returns [Action] The inverse Action
 */
Action.prototype.un = function () {
  throw undefined;
};

/**
 * Previews the effect of this Action (optional method)
 */
Action.prototype.preview = undefined;

/**
 * @returns [JSON] Serialiseable data for this Action
 */
Action.prototype.toJSON = function () {
  throw undefined;
};

/**
 * @returns [Action.OPTIONS] The expected options to be applied to an undo Action
 */
Action.prototype.undoOptions = function () {
  return { id : this.id, undo : true };
};

/**
 * @returns a batch Action as necessary with this Action and the given Action or array
 */
Action.prototype.and = function (more) {
  if (_.isEmpty(more)) {
    return this;
  } else {
    var Batch = require('./batch');
    return new Batch([this].concat(more));
  }
};

module.exports = Action;
