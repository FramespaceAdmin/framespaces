var _ = require('lodash'),
    EventEmitter = require('events');

function User(json) {
  EventEmitter.call(this);
  _.assign(this, json);

  // See ../schema/state.json
  this.state = { active : false };
};

User.prototype = Object.create(EventEmitter.prototype);
User.prototype.constructor = User;

User.prototype.use = function (newTool) {
  this.tool = newTool;
};

User.prototype.isUsing = function (toolName) {
  return _.get(this.tool, 'constructor.name') === toolName;
};

User.prototype.interacting = function (newState) {
  if ((this.state.active || newState.active) && this.tool) {
    var oldState = this.state, delta = _.transform(newState, function (delta, value, key) {
      if (key === 'char' || key === 'element') {
        delta[key] = value;
      } else if (value !== oldState[key]) {
        delta[key] = value - oldState[key];
      }
    });
    this.state = _.defaults(newState, {
      time : new Date().getTime(), // Timestamp
      tool : this.tool.constructor.name // The active tool
    }, oldState); // Carry forward unchanged state

    this.emit('interacting', delta, this.state);
    this.tool.using(delta, this.state);
    if (delta.active && !this.state.active) {
      this.emit('quiesced');
    }
    return this.state;
  } else {
    return _.assign(this.state, newState);
  }
};

/**
 * Called when the user is remomved from the Framespace, override to specialise
 */
User.prototype.removed = _.noop;

module.exports = User;
