var _ = require('lodash'),
    Action = require('../client/action');

function SetAction(options) {
  Action.call(this, options);
}
SetAction.prototype = _.assign(Object.create(Action.prototype), {
  constructor : SetAction,
  do : function (s) { return s[this.id] = true; },
  isOK : function (s) { return !s[this.id]; },
  un : function () { return new UnsetAction(this.undoOptions()); },
  toJSON : function () { return 'SetAction_' + this.id; }
});
SetAction.fromJSON = function (data) {
  return new SetAction(data);
};

function UnsetAction(options) {
  Action.call(this, options);
}
UnsetAction.prototype = _.assign(Object.create(Action.prototype), {
  constructor : UnsetAction,
  do : function (s) { delete s[this.id]; return true; },
  isOK : function (s) { return !!s[this.id]; },
  un : function () { return new SetAction(this.undoOptions()); }
});

module.exports = SetAction;
