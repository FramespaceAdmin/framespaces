var _ = require('lodash'),
    Action = require('../client/action');

function SetAction(options) {
  Action.call(this, options);
}
SetAction.prototype = _.assign(Object.create(Action.prototype), {
  constructor : SetAction,
  do : function (s) {
    return s.set ? s.set(this.id) : (s[this.id] = true);
  },
  isOK : function (s) { return !s[this.id]; },
  un : function () { return new UnsetAction({ id : this.id, undoOf : this.id }); },
  toJSON : function () { return { id : this.id, type : 'mutation' }; }
});
SetAction.fromJSON = function (data) {
  return new SetAction(data);
};

function UnsetAction(options) {
  Action.call(this, options);
}
UnsetAction.prototype = _.assign(Object.create(Action.prototype), {
  constructor : UnsetAction,
  do : function (s) {
    s.unset ? s.unset(this.id) : _.unset(s, this.id);
    return true;
  },
  isOK : function (s) { return !!s[this.id]; },
  un : function () { return new SetAction({ id : this.id, undoOf : this.id }); }
});

module.exports = SetAction;
