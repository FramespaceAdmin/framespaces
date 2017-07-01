var _ = require('lodash'),
    guid = require('../../lib/guid'),
    as = require('yavl');

function Action(options) {
  this.id = _.get(options, 'id', guid());
  this.description = _.get(options, 'description', '');
  this.confidence = _.get(options, 'confidence');
  this.isUser = _.get(options, 'isUser', false);
  this.undoOf = _.get(options, 'undoOf');
}

Action.OPTIONS = as(_.mapValues({
  id : String, // Will be set to a new GUID if not defined
  description : String, // Some kind of useful string for logging
  isUser : Boolean, // Whether the user took the action (truthy), or the system
  prev : Action, // Set by history
  next : Action, // Set by history
  results : Array, // the returned values from do(), cast to array, set by history
  confidence : as(Number).lt(1), // for futures
  undoOf : String // GUID of action which this is undoing
}, _.method('or', undefined))); // Options are optional

/**
 * All the Actions in the world.
 */
Action.constructors = _.once(function () {
  return [
    require('./batch'),
    require('./addition'),
    require('./removal'),
    require('./mutation')
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
 * @param subject the subject of the action
 * @returns [Object] An affected object or array of objects, or falsey if failed
 */
Action.prototype.do = function (subject) {
  throw undefined;
};

/**
 * @param subject the subject of the action
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
  return { id : this.id, undoOf : this.undoOf };
};

/**
 * @returns a batch Action as necessary with this Action and the given Action or array
 */
Action.prototype.and = function (more, options) {
  if (_.isEmpty(more)) {
    return _.assign(this, options);
  } else {
    var Batch = require('./batch');
    return new Batch([this].concat(more), options);
  }
};

/**
 * Gets the actions buried in this action. By default, just this action.
 */
Action.prototype.actions = function () {
  return [this];
};

module.exports = Action;
