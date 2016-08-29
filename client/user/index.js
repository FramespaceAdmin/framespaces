var _ = require('lodash'),
    _url = require('url'),
    EventEmitter = require('events'),
    html = require('html.js');

function User(json) {
  EventEmitter.call(this);

  _.assign(this, json);

  // See ../schema/state.json
  this.state = { active : false };

  this.place = html.query('#users').add(html.query('#user-template').cloneNode(true));
  this.place.id = this.id;
  this.place.style.display = 'block'; // Because template is hidden

  this.avatar = this.place.add('img');
  this.avatar.src = _url.format({
    protocol : 'http',
    host : 'robohash.org',
    pathname : this.id,
    query : { size : '80x80', set : 'set3' }
  });
  _.assign(this.avatar.style, { display : 'block', position : 'absolute', left : 0, top : 0 });
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

User.prototype.removed = function () {
  this.place.remove();
};

User.prototype.once = function (eventName, listener) {
  if (eventName === 'quiesced' && !this.state.active) {
    listener();
  } else {
    EventEmitter.prototype.once.call(this, eventName, listener);
  }
};

module.exports = User;
